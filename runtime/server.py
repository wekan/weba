#!/usr/bin/env python3
"""Local Gambas CGI host preserving runtime and database environment settings."""
import argparse
import errno
import ipaddress
import hashlib
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import urllib.parse


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
            env.update(REQUEST_METHOD=self.command, SCRIPT_NAME='/', PATH_INFO=decoded_path,
                       QUERY_STRING=url.query, SERVER_NAME=self.server.server_address[0],
                       SERVER_PORT=str(self.server.server_port), SERVER_PROTOCOL='HTTP/1.1',
                       REMOTE_ADDR=self.client_address[0], GATEWAY_INTERFACE='CGI/1.1')
            for key in ['Host', 'Cookie', 'User-Agent', 'Accept', 'Accept-Language']:
                if key in self.headers: env['HTTP_' + key.upper().replace('-', '_')] = self.headers[key]
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 <= length <= 20 * 1024 * 1024:
                    self.send_error(413); return
                body = self.rfile.read(length)
                env.update(CONTENT_LENGTH=str(length), CONTENT_TYPE=self.headers.get('Content-Type', ''))
                if decoded_path == '/x':
                    try:
                        fields = urllib.parse.parse_qs(body.decode('utf-8'), strict_parsing=True,
                                                       errors='strict', max_num_fields=1)
                        if set(fields) != {'c'} or len(fields['c']) != 1:
                            raise ValueError('One command is required')
                    except (ValueError, UnicodeError):
                        self.send_error(400, 'Invalid native command body')
                        return
                    # Gambas 3.20 forwards only CGI variables to its persistent
                    # session process (not stdin). Translate the already checked
                    # POST body internally; no command appears in an HTTP URL.
                    env.update(QUERY_STRING=urllib.parse.urlencode({'c': fields['c'][0]}, quote_via=urllib.parse.quote),
                               REQUEST_METHOD='GET', CONTENT_LENGTH='0', CONTENT_TYPE='')
                    body = b''
                command = [runner, '-s', 'RestApi', str(application)] if api else [runner, str(application)]
                result = subprocess.run(command, input=body,
                                        env=env, capture_output=True, timeout=30)
                headers, separator, body = result.stdout.partition(b'\r\n\r\n')
                if not separator: headers, separator, body = result.stdout.partition(b'\n\n')
                if result.returncode or not separator: raise RuntimeError('CGI failed')
                parsed = []
                status = 200
                for header in headers.splitlines():
                    if b':' not in header: continue
                    key, value = header.decode().split(':', 1)
                    if key.lower() == 'status': status = int(value.strip().split()[0])
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
