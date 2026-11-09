#!/usr/bin/env python3
"""Local Gambas CGI host preserving runtime and database environment settings."""
import argparse
import base64
import unicodedata
import errno
import ipaddress
import hashlib
import json
import math
import secrets
import threading
import time
import tempfile
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import urllib.parse


def is_attachment_export_path(path):
    parts = path.split('/')
    if len(parts) == 8 and parts[-1] == '':
        parts.pop()
    return (len(parts) == 7 and parts[:3] == ['', 'api', 'boards']
            and bool(parts[3]) and parts[4] == 'attachments'
            and bool(parts[5]) and parts[6] == 'export')


def attachment_export_credential(query):
    """Strip the source-compatible URL credential before the CGI boundary."""
    try:
        pairs = urllib.parse.parse_qsl(query, keep_blank_values=True, max_num_fields=1000)
    except ValueError:
        return '', 'bad-query', ''
    values = [value for key, value in pairs if key == 'authToken']
    structured = any(key.startswith('authToken[') for key, _ in pairs)
    clean = urllib.parse.urlencode([(key, value) for key, value in pairs
                                  if key != 'authToken' and not key.startswith('authToken[')])
    if len(values) > 1 or structured:
        return clean, 'bad-query', ''
    if not values or not values[0]:
        return clean, 'none', ''
    value = values[0]
    if len(value.encode('utf-16-le', errors='surrogatepass')) // 2 > 10000:
        return clean, 'too-long', ''
    if len(value) != 43 or any(char not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for char in value):
        return clean, 'invalid', ''
    return clean, 'token', hashlib.sha256(value.encode()).hexdigest()


def canonical_card_dates(body):
    """Preserve card date numbers and supplementary description characters.

    Date numbers are integer milliseconds after TimeClip. Normalize them before
    Gambas can round a decimal/exponent token by a millisecond at large epochs.
    Invalid numbers stay invalid date values, rather than becoming clears.
    Valid escaped UTF-16 pairs in descriptions are forwarded as UTF-8 because
    Gambas 3.20 otherwise drops them.
    Syntax/authentication errors remain the application's responsibility.
    """
    if len(body) > 1048576:
        return body  # Do not compact an oversized body past the CGI size gate.
    def reject_constant(value):
        raise ValueError(value)
    try:
        data = json.loads(body.decode('utf-8'), parse_constant=reject_constant)
        if not isinstance(data, dict):
            return body
        # Gambas 3.20 drops JSON-escaped UTF-16 surrogate pairs. Python has
        # joined valid pairs; serialize a supplementary description as UTF-8.
        description = data.get('description')
        changed = isinstance(description, str) and any(ord(char) > 0xffff for char in description)
        for key in ('receivedAt', 'startAt', 'dueAt', 'endAt'):
            value = data.get(key)
            if type(value) is float:
                data[key] = math.trunc(value) if math.isfinite(value) and abs(value) <= 8640000000000000 else {}
                changed = True
            elif type(value) is int and abs(value) > 8640000000000000:
                data[key] = {}
                changed = True
        return json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8') if changed else body
    except (ValueError, UnicodeError, OverflowError, RecursionError):
        return body


def canonical_upload_unicode(body):
    """Retain valid escaped supplementary filename/type characters on Gambas 3.20."""
    try:
        data = json.loads(body.decode('utf-8'))
        if isinstance(data, dict) and any(isinstance(data.get(key), str) and
                any(ord(char) > 0xffff for char in data[key]) for key in ('fileName', 'fileType')):
            return json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')
    except (ValueError, UnicodeError, OverflowError, RecursionError):
        pass
    return body


def attachment_disposition(filename):
    """ASCII fallback plus the source RFC 5987 UTF-8 filename."""
    ascii_name = ''.join(char for char in unicodedata.normalize('NFKD', filename)
                         if 32 <= ord(char) <= 126).replace('\\', '-').replace('"', '-') or 'export'
    encoded = urllib.parse.quote(filename, safe="~!*'()-._")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded}"


def run_application(command, *, input, env, timeout=30):
    """A CGI descendant must not hold capture pipes open after a timeout.

    TemporaryFile is private/unlinked on supported Linux runtimes. File-backed
    output allows subprocess.run to kill/wait only for the direct process,
    without a descendant keeping communicate() blocked on inherited stdout.
    """
    with tempfile.TemporaryFile(dir=env.get('TMPDIR')) as output, tempfile.TemporaryFile(dir=env.get('TMPDIR')) as errors:
        result = subprocess.run(command, input=input, env=env, stdout=output, stderr=errors, timeout=timeout)
        output.seek(0)
        result.stdout = output.read()
        # CGI stderr can contain sensitive runtime diagnostics. Do not log it.
        return result


class LoginThrottle:
    """Bounded per-peer login window; forwarded identity headers are untrusted."""
    def __init__(self, clock=time.monotonic, limit=5, window=60, capacity=4096):
        self.clock, self.limit, self.window, self.capacity = clock, limit, window, capacity
        self.attempts = {}
        self.lock = threading.Lock()

    def admit(self, peer):
        now = self.clock()
        with self.lock:
            for key in list(self.attempts):
                self.attempts[key] = [stamp for stamp in self.attempts[key] if stamp > now - self.window]
                if not self.attempts[key]:
                    del self.attempts[key]
            stamps = self.attempts.get(peer, [])
            if len(stamps) >= self.limit:
                return max(1, int(self.window - (now - stamps[0])) + 1)
            if peer not in self.attempts and len(self.attempts) >= self.capacity:
                return int(self.window)
            self.attempts.setdefault(peer, []).append(now)
            return 0

    def success(self, peer):
        with self.lock:
            self.attempts.pop(peer, None)


def handler(application, runner, environment):
    login_throttle = LoginThrottle()
    class GambasHandler(BaseHTTPRequestHandler):
        def do_GET(self): self.run_cgi()
        def do_POST(self): self.run_cgi()
        def do_PUT(self): self.run_cgi()
        def do_DELETE(self): self.run_cgi()
        def do_PATCH(self): self.run_cgi()
        def end_headers(self):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
            self.send_header('Referrer-Policy', 'same-origin')
            super().end_headers()

        def _request_allowed(self, url):
            """Require trusted authority and a non-simple native mutation request.

            Native updates include credentials. Requiring POST plus a custom
            header prevents forms, images and cross-origin fetches (preflight
            is not enabled). Origin/Fetch Metadata also reject sibling origins.
            """
            try:
                authority = urllib.parse.urlsplit('http://' + self.headers.get('Host', ''))
                if not authority.hostname or authority.username or authority.password or authority.path or authority.query or authority.fragment:
                    raise ValueError('Invalid authority')
                port = authority.port
                public = environment.get('WEBA_PUBLIC_URL')
                if public:
                    expected = urllib.parse.urlsplit(public)
                    if expected.scheme not in ('http', 'https') or not expected.hostname or expected.username or expected.password or expected.query or expected.fragment or expected.path not in ('', '/'):
                        raise ValueError('Invalid public URL')
                    expected_port = expected.port or (443 if expected.scheme == 'https' else 80)
                    port = port or (443 if expected.scheme == 'https' else 80)
                    if (authority.hostname, port) != (expected.hostname, expected_port):
                        raise ValueError('Untrusted authority')
                    origin = (expected.scheme, expected.hostname, expected_port)
                else:
                    port = port or 80
                    host = authority.hostname
                    bound_host = self.server.server_address[0]
                    if host != 'localhost':
                        address = ipaddress.ip_address(host)
                        if bound_host not in ('0.0.0.0', '::') and not address.is_loopback and host != bound_host:
                            raise ValueError('Untrusted authority')
                    if port != self.server.server_port:
                        raise ValueError('Untrusted port')
                    origin = ('http', host, port)
                native = url.path in ('/x', '/c') or url.path.startswith(('/upload:', '/call:'))
                if not native:
                    return True
                if self.command != 'POST':
                    self.send_error(405, 'Native commands require POST')
                    return False
                if self.headers.get('X-WeBa-Request') != '1':
                    raise ValueError('Missing native request header')
                if self.headers.get('Sec-Fetch-Site', 'same-origin') not in ('same-origin', 'none'):
                    raise ValueError('Cross-origin request')
                for name in ('Origin', 'Referer'):
                    if name not in self.headers:
                        continue
                    value = urllib.parse.urlsplit(self.headers[name])
                    value_port = value.port or (443 if value.scheme == 'https' else 80)
                    if value.username or value.password or (value.scheme, value.hostname, value_port) != origin:
                        raise ValueError('Cross-origin request')
                if url.path == '/x':
                    if url.query or self.headers.get_content_type() != 'application/x-www-form-urlencoded':
                        raise ValueError('Command must be in a form body')
                return True
            except (ValueError, TypeError):
                self.send_error(403, 'Request origin not allowed')
                return False
        def log_message(self, *args): pass  # Gambas update URLs can contain passwords.
        def run_cgi(self):
            try:
                self._run_cgi()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                self.close_connection = True

        def _read_body(self, length, timeout=30):
            """One absolute deadline, including clients that drip bytes forever."""
            deadline = time.monotonic() + timeout
            connection = getattr(self, 'connection', None)
            previous_timeout = connection.gettimeout() if connection is not None else None
            chunks = []
            remaining = length
            try:
                while remaining:
                    seconds = deadline - time.monotonic()
                    if seconds <= 0:
                        raise TimeoutError('Request timeout')
                    if connection is not None:
                        connection.settimeout(seconds)
                    chunk = self.rfile.read1(min(remaining, 65536))
                    if not chunk:
                        raise ValueError('Incomplete request body')
                    chunks.append(chunk)
                    remaining -= len(chunk)
                return b''.join(chunks)
            finally:
                if connection is not None:
                    connection.settimeout(previous_timeout)

        def _upload_body_error(self, status, message):
            self.close_connection = True
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': message}).encode())

        def _run_cgi(self):
            url = urllib.parse.urlsplit(self.path)
            # Gambas exposes /~dump before application dispatch. It prints the
            # CGI environment, including database credentials. Never expose
            # development routes through the installed HTTP host.
            decoded_path = url.path
            for _ in range(3):
                decoded_path = urllib.parse.unquote(decoded_path)
                if decoded_path.startswith('/~'):
                    self.send_error(404)
                    return
            segments = decoded_path.replace(':', '/').split('/')
            if (urllib.parse.unquote(decoded_path) != decoded_path or '\\' in decoded_path
                    or any(ord(character) < 32 or ord(character) == 127 for character in decoded_path)
                    or any(segment and set(segment) == {'.'} for segment in segments)):
                # Gambas sends files relative to .public; do not let dot paths,
                # including library/icon prefixes, escape that asset boundary.
                self.send_error(404)
                return
            if not self._request_allowed(url._replace(path=decoded_path)):
                return
            api = decoded_path.lower() == '/api' or decoded_path.lower().startswith('/api/') or decoded_path.lower() in ('/users/login', '/users/logout')
            login = decoded_path == '/users/login' and self.command == 'POST'
            if login:
                retry = login_throttle.admit(self.client_address[0])
                if retry:
                    self.send_response(429)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Retry-After', str(retry))
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.wfile.write(b'{"error":"Too many failed login attempts. Try again later."}')
                    return
            env = environment.copy()
            env['WEBA_API_REQUEST'] = '1' if api else '0'
            env['WEBA_COMMAND_FILE'] = ''
            if api:
                token = secrets.token_urlsafe(32)
                env['WEBA_API_NEW_TOKEN'] = token
                env['WEBA_API_NEW_DIGEST'] = hashlib.sha256(token.encode()).hexdigest()
                env['WEBA_API_TOKEN_DIGEST'] = ''
                env['WEBA_API_EXPIRES_ISO'] = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat().replace('+00:00', 'Z')
                authorization = self.headers.get('Authorization', '')
                if authorization.lower().startswith('bearer '):
                    raw = authorization[7:]
                    if len(raw) == 43 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for c in raw):
                        env['WEBA_API_TOKEN_DIGEST'] = hashlib.sha256(raw.encode()).hexdigest()
            query = url.query
            env['WEBA_EXPORT_QUERY_STATE'] = ''
            env['WEBA_EXPORT_HEADER_PRESENT'] = '0'
            if api and is_attachment_export_path(decoded_path):
                query, state, digest = attachment_export_credential(query)
                env['WEBA_EXPORT_QUERY_STATE'] = state
                env['WEBA_EXPORT_HEADER_PRESENT'] = '1' if authorization else '0'
                if state != 'none':
                    env['WEBA_API_TOKEN_DIGEST'] = digest
            env.update(REQUEST_METHOD=self.command, SCRIPT_NAME='/', PATH_INFO=decoded_path,
                       QUERY_STRING=query, SERVER_NAME=self.server.server_address[0],
                       SERVER_PORT=str(self.server.server_port), SERVER_PROTOCOL='HTTP/1.1',
                       REMOTE_ADDR=self.client_address[0], GATEWAY_INTERFACE='CGI/1.1')
            for key in ['Host', 'Cookie', 'User-Agent', 'Accept', 'Accept-Language']:
                if key in self.headers: env['HTTP_' + key.upper().replace('-', '_')] = self.headers[key]
            try:
                length = int(self.headers.get('Content-Length', '0'))
                upload = decoded_path == '/api/attachment/upload' and self.command == 'POST'
                native_upload = decoded_path.startswith('/upload:') and self.command == 'POST'
                body_limit = 96 * 1024 * 1024 if upload or native_upload else 20 * 1024 * 1024
                if not 0 <= length <= body_limit:
                    if upload:
                        self._upload_body_error(413, 'Request payload exceeds server safety limit')
                    else:
                        self.send_error(413)
                    return
                try:
                    body = self._read_body(length)
                except TimeoutError:
                    if upload:
                        self._upload_body_error(408, 'Request timeout')
                    else:
                        self.close_connection = True
                        self.send_error(408)
                    return
                except ValueError:
                    if upload:
                        self._upload_body_error(400, 'Request error')
                    else:
                        self.close_connection = True
                        self.send_error(400)
                    return
                pieces = decoded_path.strip('/').split('/')
                if (api and self.command == 'PUT' and len(pieces) == 7
                        and pieces[0:2] == ['api', 'boards'] and pieces[3] == 'lists' and pieces[5] == 'cards'
                        and self.headers.get('Content-Type', '').split(';', 1)[0].strip().lower() == 'application/json'):
                    body = canonical_card_dates(body)
                    length = len(body)
                if (api and decoded_path == '/api/attachment/upload' and self.command == 'POST'
                        and self.headers.get('Content-Type', '').split(';', 1)[0].strip().lower() == 'application/json'):
                    body = canonical_upload_unicode(body)
                    length = len(body)
                env.update(CONTENT_LENGTH=str(length), CONTENT_TYPE=self.headers.get('Content-Type', ''))
                command_text = None
                if decoded_path == '/x':
                    try:
                        fields = urllib.parse.parse_qs(body.decode('utf-8'), strict_parsing=True,
                                                       errors='strict', max_num_fields=1)
                        if set(fields) != {'c'} or len(fields['c']) != 1:
                            raise ValueError('One command is required')
                    except (ValueError, UnicodeError):
                        self.send_error(400, 'Invalid native command body')
                        return
                    # Gambas 3.20 forwards CGI variables, not stdin, to its
                    # session process. Its query decoder requires percent-encoded
                    # spaces. Large commands must avoid the OS env-string limit.
                    command_text = urllib.parse.urlencode({'c': fields['c'][0]}, quote_via=urllib.parse.quote)
                    env.update(QUERY_STRING='', REQUEST_METHOD='GET', CONTENT_LENGTH='0', CONTENT_TYPE='')
                    body = b''
                command = [runner, '-s', 'RestApi', str(application)] if api else [runner, str(application)]
                if command_text is not None and len(command_text.encode()) > 32768:
                    # NamedTemporaryFile creates mode 0600 and deletes even on
                    # timeout/failure. Only its path crosses the exec boundary.
                    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', prefix='weba-command.',
                                                     dir=environment.get('TMPDIR')) as private:
                        private.write(fields['c'][0])
                        private.flush()
                        env['WEBA_COMMAND_FILE'] = private.name
                        env['QUERY_STRING'] = urllib.parse.urlencode({
                            'c': '["update",null,"weba-large-update",null,true]'
                        }, quote_via=urllib.parse.quote)
                        result = run_application(command, input=body, env=env, timeout=30)
                else:
                    if command_text is not None:
                        env['QUERY_STRING'] = command_text
                    result = run_application(command, input=body, env=env, timeout=30)
                boundaries = [(result.stdout.find(separator), separator)
                              for separator in (b'\r\n\r\n', b'\n\n')
                              if result.stdout.find(separator) >= 0]
                if result.returncode or not boundaries:
                    raise RuntimeError('CGI failed')
                # The first blank line ends headers. A later delimiter may be
                # arbitrary binary file content, including the other EOL form.
                offset, separator = min(boundaries, key=lambda item: item[0])
                headers = result.stdout[:offset]
                body = result.stdout[offset + len(separator):]
                parsed = []
                status = 200
                for header in headers.splitlines():
                    if b':' not in header: continue
                    key, value = header.decode().split(':', 1)
                    if key.lower() == 'status': status = int(value.strip().split()[0])
                    elif key.lower() == 'x-weba-download-name':
                        # Internal CGI metadata never reaches the client. Only a
                        # genuine raw attachment response may name a download.
                        pieces = decoded_path.strip('/').split('/')
                        if not (api and self.command == 'GET' and len(pieces) == 4
                                and pieces[:3] == ['api', 'attachment', 'download']):
                            raise RuntimeError('Invalid download metadata')
                        filename = base64.b64decode(value.strip(), validate=True).decode('utf-8')
                        parsed.append(('Content-Disposition', attachment_disposition(filename)))
                    elif key.lower() not in ['content-length', 'connection', 'transfer-encoding']:
                        parsed.append((key, value.strip()))
                if login and status == 200:
                    login_throttle.success(self.client_address[0])
                self.send_response(status)
                for key, value in parsed: self.send_header(key, value)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                raise
            except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired):
                self.send_error(500, 'Gambas request failed')
    return GambasHandler


def bind_server(host, port, request_handler, preferred_port=8080):
    """Prefer 8080 by default; let the OS atomically choose a free fallback.

    Explicit ports (including Docker's mapped port) must not silently change.
    """
    try:
        return ThreadingHTTPServer((host, preferred_port if port is None else port), request_handler)
    except OSError as error:
        if port is not None or error.errno != errno.EADDRINUSE:
            raise
        return ThreadingHTTPServer((host, 0), request_handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True, type=Path)
    parser.add_argument('--runner', default='gbr3')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=None,
                        help='Explicit port (0 selects a free port); default prefers 8080 and falls back to a free port')
    parser.add_argument('--data', type=Path, default=Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'weba')
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.setdefault('WEBA_DB_HOST', str(args.data.resolve()))
    server = bind_server(args.host, args.port, handler(args.app.resolve(), args.runner, env))
    print(f'WeBa: http://{args.host}:{server.server_port} — data: {args.data}', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == '__main__': main()
