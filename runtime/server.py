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
import re
import secrets
import threading
import time
import tempfile
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie, CookieError
from pathlib import Path
import os
import subprocess
import signal
import urllib.parse


def all_boards_entry_section(path):
    """Implemented native section entrypoints; never an arbitrary CGI alias."""
    if path in ('/public', '/public/'):
        return 'public'
    if path == '/allboards/workspaces' or path.startswith('/allboards/workspaces/'):
        return 'workspaces'
    for section in ('remaining', 'starred', 'archive', 'home'):
        if path in ('/allboards/' + section, '/allboards/' + section + '/'):
            return section
    return None


def board_entry(path):
    """Native board IDs, optional human slug; never arbitrary CGI aliases."""
    match = re.fullmatch(r'/b/([1-9][0-9]{0,9})(?:/([^/]+))?/?', path)
    return bool(match and int(match[1]) <= 2147483647)


def card_entry(path):
    """The source card route is /b/:boardId/:slug/:cardId, not a CGI path."""
    match = re.fullmatch(r'/b/([1-9][0-9]{0,9})/([^/]+)/([1-9][0-9]{0,9})/?', path)
    return bool(match and int(match[1]) <= 2147483647 and int(match[3]) <= 2147483647)


def is_attachment_export_path(path):
    parts = path.split('/')
    if len(parts) == 8 and parts[-1] == '':
        parts.pop()
    return (len(parts) == 7 and parts[:3] == ['', 'api', 'boards']
            and bool(parts[3]) and parts[4] == 'attachments'
            and bool(parts[5]) and parts[6] == 'export')


def is_issue_export_path(path):
    parts = path.rstrip('/').split('/')
    return (len(parts) == 6 and parts[:3] == ['', 'api', 'boards']
            and bool(parts[3]) and parts[4] == 'export'
            and parts[5] in ('github', 'gitea', 'forgejo', 'gitlab', 'trello', 'deck', 'kanboard', 'markdown', 'leo', 'opml')
            and path in ('/'.join(parts), '/'.join(parts) + '/'))


def issue_export_fields(query):
    try:
        pairs = urllib.parse.parse_qsl(query, keep_blank_values=True, max_num_fields=1000)
    except ValueError:
        return ''
    values = [value for key, value in pairs if key == 'fields']
    if len(values) != 1 or any(key.startswith('fields[') for key, _ in pairs):
        return ''
    return values[0]


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


def canonical_board_view_policy(body, content_type):
    """Keep source coercion/nulls across Gambas 3.20's reused JSON decoder."""
    def invalid_constant(value):
        raise ValueError('Invalid JSON number')

    def decode(value):
        return json.loads(value, parse_constant=invalid_constant)

    def shown(value):
        # String(array).toLowerCase() is "true" only for a single element
        # recursively stringifying to true; a longer array contains a comma.
        while isinstance(value, list) and len(value) == 1:
            value = value[0]
        return value is True or isinstance(value, str) and value.lower() == 'true'

    def structured(key, value):
        if value is None:
            return False  # Preserve an invalid explicit null as an invalid type.
        if key == 'boardViewSettings' and isinstance(value, dict):
            for view, entry in value.items():
                if entry is None:
                    value[view] = False
                elif isinstance(entry, dict):
                    value[view] = {flag: shown(entry[flag]) for flag in
                                   ('showOnPublic', 'showOnPrivate') if flag in entry}
        if key == 'boardViewOrder' and isinstance(value, list):
            return [False if item is None else item for item in value]
        return value

    def field(key, value):
        if key in ('boardViewSettings', 'boardViewOrder'):
            if isinstance(value, str):
                try:
                    return json.dumps(structured(key, decode(value)), separators=(',', ':'))
                except (ValueError, TypeError):
                    if key == 'boardViewOrder':
                        whitespace = '\u0009\u000a\u000b\u000c\u000d \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
                        return json.dumps([part.strip(whitespace) for part in value.split(',')])
                    return value
            return structured(key, value)
        if key in ('defaultPublicBoardView', 'defaultPrivateBoardView') and value is None:
            return False
        return value

    mime = content_type.split(';', 1)[0].strip().lower()
    try:
        if mime == 'application/json':
            value = decode(body)
            if not isinstance(value, dict):
                return body
            return json.dumps({key: field(key, item) for key, item in value.items() if key in
                               ('boardViewSettings', 'boardViewOrder', 'defaultPublicBoardView', 'defaultPrivateBoardView')},
                              separators=(',', ':')).encode()
        if mime == 'application/x-www-form-urlencoded':
            pairs = urllib.parse.parse_qsl(body.decode('utf-8'), keep_blank_values=True,
                                          errors='strict', max_num_fields=10000)
            counts = {}
            for key, _ in pairs:
                counts[key] = counts.get(key, 0) + 1
            return urllib.parse.urlencode([(key, field(key, value) if counts[key] == 1 else value)
                                          for key, value in pairs]).encode()
    except (ValueError, TypeError, UnicodeError, RecursionError):
        return b'!'  # No valid recognized request; authorization still runs first.
    return body


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
    """Capture the complete response, including descendant writes, by a deadline.

    EOF belongs to all writers, not just the direct CGI process. A private
    stderr file keeps runtime diagnostics out of responses and avoids waiting
    for inherited stderr handles. Kill the request group on timeout, then close
    unbuffered capture pipes without waiting for detached descendants.
    """
    with tempfile.TemporaryFile(dir=env.get('TMPDIR')) as errors:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=errors, env=env, start_new_session=True, bufsize=0)
        try:
            output, _ = process.communicate(input=input, timeout=timeout)
        except subprocess.TimeoutExpired:
            if os.name == 'posix':
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            if process.poll() is None:
                process.kill()
            process.wait(timeout=1)
            for stream in (process.stdin, process.stdout):
                if stream is not None:
                    stream.close()
            raise
        return subprocess.CompletedProcess(command, process.returncode, stdout=output)


class NativeRequestCoordinator:
    """Coordinate real gb.web.gui cookie names with bounded lock stripes."""
    def __init__(self, stripes=256):
        self.locks = [threading.Lock() for _ in range(stripes)]

    def run(self, command, *, input, env, timeout=30):
        if env.get('WEBA_API_REQUEST') == '1':
            return run_application(command, input=input, env=env, timeout=timeout)
        cookies = SimpleCookie()
        try:
            cookies.load(env.get('HTTP_COOKIE', ''))
        except CookieError:
            cookies.clear()
        sessions = [cookie.value for name, cookie in cookies.items()
                    if name == 'GBSESSIONID' or (name.startswith('GBSESSIONID-') and
                    name[12:] and all(char in '0123456789ABCDEF' for char in name[12:]))]
        if not sessions:
            return run_application(command, input=input, env=env, timeout=timeout)
        indices = sorted({int.from_bytes(hashlib.sha256(value.encode()).digest()[:4], 'big') % len(self.locks)
                          for value in sessions})
        deadline = time.monotonic() + timeout
        acquired = []
        try:
            for index in indices:
                if not self.locks[index].acquire(timeout=max(0, deadline - time.monotonic())):
                    raise RuntimeError('Native session busy')
                acquired.append(index)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise RuntimeError('Native session busy')
            return run_application(command, input=input, env=env, timeout=remaining)
        finally:
            for index in reversed(acquired):
                self.locks[index].release()


class NativeDocuments:
    """Opaque document routing, bound to a separate HttpOnly login cookie.

    The page token is a routing namespace, never an authentication credential.
    Each page owns one Gambas GUI process; API requests never consult this map.
    """
    def __init__(self):
        self.pages = {}
        self.lock = threading.Lock()

    @staticmethod
    def cookies(header):
        values = SimpleCookie()
        try:
            values.load(header)
        except CookieError:
            values.clear()
        return values

    @staticmethod
    def native_name(name):
        return name == 'GBSESSIONID' or (name.startswith('GBSESSIONID-') and
            name[12:] and all(char in '0123456789ABCDEF' for char in name[12:]))

    @classmethod
    def identity(cls, header):
        cookie = cls.cookies(header).get('WEBA_UI_AUTH')
        raw = cookie.value if cookie else ''
        if not re.fullmatch(r'[A-Za-z0-9_-]{43}', raw):
            return ''
        return hashlib.sha256(raw.encode()).hexdigest()

    def select(self, token, header):
        identity = self.identity(header)
        with self.lock:
            page = self.pages.get(token)
            if not page or page['identity'] != identity:
                return None
            page['seen'] = time.monotonic()
            return page.copy()

    def remember(self, token, headers, incoming, previous=None):
        cookies = self.cookies(incoming)
        native = previous['cookie'] if previous else None
        for key, value in headers:
            if key.lower() != 'set-cookie':
                continue
            for name, cookie in self.cookies(value).items():
                if self.native_name(name) and cookie.value:
                    native = (name, cookie.value)
                if name == 'WEBA_UI_AUTH':
                    cookies[name] = cookie.value
        if not native:
            return
        identity = self.identity(cookies.output(header='', sep=';'))
        now = time.monotonic()
        with self.lock:
            self.pages[token] = dict(
                cookie=native, identity=identity,
                authenticated=bool(identity) or bool(previous and previous.get('authenticated')),
                seen=now, pulse=self.pages.get(token, {}).get('pulse', 0))
            # Inactive GUI processes have already timed out. No fixed tab limit.
            for key in list(self.pages):
                if self.pages[key]['seen'] < now - 1200:
                    del self.pages[key]

    def keep_peers(self, token, incoming, environment, command, coordinator):
        identity = self.identity(incoming)
        if not identity:
            return
        now = time.monotonic()
        with self.lock:
            peers = []
            for key, page in self.pages.items():
                if key != token and page['identity'] == identity and page.get('pulse', 0) < now - 10:
                    page['pulse'] = now
                    peers.append((key, page.copy()))
        if not peers:
            return

        def pulse():
            for key, page in peers:
                env = environment.copy()
                env.update(HTTP_COOKIE=self.cookie_header(incoming, page), WEBA_COMMAND_FILE='',
                           PATH_INFO='/x', REQUEST_METHOD='GET', CONTENT_LENGTH='0', CONTENT_TYPE='',
                           QUERY_STRING=urllib.parse.urlencode({'c': '["weba-passive"]'}),
                           WEBA_NATIVE_PASSIVE='1', WEBA_NATIVE_NOW=str(int(time.time())))
                try:
                    result = coordinator.run(command, input=b'', env=env, timeout=5)
                    # Gambas replies with reload for an expired/missing process.
                    # Do not renew a dead page's registry lease indefinitely.
                    if result.returncode or b'location.reload' in result.stdout:
                        self.forget(key)
                        continue
                    with self.lock:
                        if key in self.pages:
                            self.pages[key]['seen'] = time.monotonic()
                except (OSError, RuntimeError, subprocess.TimeoutExpired):
                    pass  # A closed or timed-out document cannot affect the requesting page.
        threading.Thread(target=pulse, daemon=True).start()

    def forget(self, token):
        with self.lock:
            self.pages.pop(token, None)

    def cookie_header(self, incoming, page):
        cookies = self.cookies(incoming)
        for name in list(cookies):
            if self.native_name(name):
                del cookies[name]
        if page:
            name, value = page['cookie']
            cookies[name] = value
        return cookies.output(header='', sep=';').strip()


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
    native_requests = NativeRequestCoordinator()
    documents = NativeDocuments()
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
                native = url.path in ('/x', '/c', '/_weba/page-close') or url.path.startswith(('/upload:', '/call:'))
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
            entry_section = all_boards_entry_section(decoded_path) or ('board' if board_entry(decoded_path) or card_entry(decoded_path) else None)
            if (decoded_path == '/b' or decoded_path.startswith('/b/')) and not entry_section:
                self.send_error(404)
                return
            if decoded_path.startswith("/public/") and not entry_section:
                self.send_error(404)
                return
            if decoded_path.startswith("/allboards/home/") and not entry_section:
                self.send_error(404)
                return
            if entry_section:
                try:
                    single_path = None if re.search(r'%(?![0-9A-Fa-f]{2})', url.path) else urllib.parse.unquote(url.path, errors='strict')
                except UnicodeError:
                    single_path = None
                if single_path != decoded_path or (card_entry(decoded_path) and re.search(r'%2f', url.path, re.IGNORECASE)):
                    # An encoded board-slug slash must not become a card-route separator.
                    self.send_error(404)
                    return
                if self.command != 'GET':
                    self.send_error(405)
                    return
            public_attachment = decoded_path.startswith('/_weba/public-attachment/')
            if decoded_path == '/_weba/public-attachment' or public_attachment:
                if (not re.fullmatch(r'/_weba/public-attachment/[1-9][0-9]{0,9}/[1-9][0-9]{0,9}/[1-9][0-9]{0,9}', decoded_path)
                        or url.path != decoded_path
                        or any(int(part) > 2147483647 for part in decoded_path.split('/')[3:])):
                    self.send_error(404)
                    return
                if self.command != 'GET':
                    self.send_error(405)
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
            env['WEBA_PUBLIC_ATTACHMENT'] = '1' if public_attachment else '0'
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
            query = "" if entry_section or public_attachment else url.query
            env['WEBA_EXPORT_QUERY_STATE'] = ''
            env['WEBA_EXPORT_HEADER_PRESENT'] = '0'
            env['WEBA_EXTERNAL_FIELDS'] = issue_export_fields(query) if api and is_issue_export_path(decoded_path) else ''
            if api and (is_attachment_export_path(decoded_path) or is_issue_export_path(decoded_path)):
                query, state, digest = attachment_export_credential(query)
                env['WEBA_EXPORT_QUERY_STATE'] = state
                env['WEBA_EXPORT_HEADER_PRESENT'] = '1' if authorization else '0'
                if state != 'none':
                    env['WEBA_API_TOKEN_DIGEST'] = digest
            env.update(REQUEST_METHOD=self.command, SCRIPT_NAME='/', PATH_INFO='/' if entry_section else decoded_path,
                       QUERY_STRING=query, SERVER_NAME=self.server.server_address[0],
                       SERVER_PORT=str(self.server.server_port), SERVER_PROTOCOL='HTTP/1.1',
                       REMOTE_ADDR=self.client_address[0], GATEWAY_INTERFACE='CGI/1.1')
            for key in ['Host', 'Cookie', 'User-Agent', 'Accept', 'Accept-Language']:
                if key in self.headers: env['HTTP_' + key.upper().replace('-', '_')] = self.headers[key]
            native = decoded_path in ('/x', '/c', '/_weba/page-close') or decoded_path.startswith(('/upload:', '/call:'))
            document = not api and self.command == 'GET' and (decoded_path == '/' or entry_section)
            env.update(WEBA_GUEST_BOARD='', WEBA_GUEST_CARD='', WEBA_GUEST_SIGNIN='0')
            if document and (board_entry(decoded_path) or card_entry(decoded_path)):
                parts = decoded_path.strip('/').split('/')
                env['WEBA_GUEST_BOARD'] = parts[1]
                if card_entry(decoded_path):
                    env['WEBA_GUEST_CARD'] = parts[3]
                try:
                    sign_in = urllib.parse.parse_qs(url.query, keep_blank_values=True, max_num_fields=1000).get('signin', [])
                except ValueError:
                    sign_in = []
                env['WEBA_GUEST_SIGNIN'] = '1' if sign_in == ['1'] else '0'
            page_token = self.headers.get('X-WeBa-Page', '')
            incoming = self.headers.get('Cookie', '')
            page = documents.select(page_token, incoming) if page_token else None
            # Legacy native clients can still address their one registered GUI.
            if native and not page_token:
                cookies = documents.cookies(incoming)
                with documents.lock:
                    candidates = [(key, value) for key, value in documents.pages.items()
                                  if value['identity'] == documents.identity(incoming)
                                  and value['cookie'][0] in cookies
                                  and cookies[value['cookie'][0]].value == value['cookie'][1]]
                if len(candidates) == 1:
                    page_token, page = candidates[0]
            if native and not page:
                if decoded_path == '/x' and page_token:
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/javascript;charset=utf-8')
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.wfile.write(b'location.reload(true);')
                else:
                    self.send_error(403, 'Document session unavailable')
                return
            if not api:
                token = secrets.token_urlsafe(32)
                env.update(WEBA_NATIVE_AUTH='1', WEBA_NATIVE_NOW=str(int(time.time())),
                           WEBA_NATIVE_AUTH_DIGEST=documents.identity(incoming),
                           WEBA_NATIVE_NEW_TOKEN=token,
                           WEBA_NATIVE_NEW_DIGEST=hashlib.sha256(token.encode()).hexdigest(),
                           WEBA_NATIVE_PASSIVE='0')
                if native or document:
                    env['HTTP_COOKIE'] = documents.cookie_header(incoming, page)
                if document and not page:
                    page_token = secrets.token_urlsafe(32)
            try:
                # Native callbacks bypass application form-event authentication.
                if not api and document and page and (env['WEBA_NATIVE_AUTH_DIGEST'] or page.get('authenticated')):
                    probe = run_application([runner, '-s', 'NativeAuthProbe', str(application)], input=b'', env=env, timeout=30)
                    if probe.returncode or not probe.stdout.startswith(b'Status: 204'):
                        if document:
                            page = None
                            page_token = secrets.token_urlsafe(32)
                            env['HTTP_COOKIE'] = documents.cookie_header(incoming, None)
                        else:
                            self.send_error(401, 'Sign in required')
                            return
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
                if (api and self.command == 'PUT' and len(pieces) == 4
                        and pieces[:2] == ['api', 'boards'] and pieces[3] == 'boardViewSettings'):
                    body = canonical_board_view_policy(body, self.headers.get('Content-Type', ''))
                    length = len(body)
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
                if not api and (decoded_path == '/c' or decoded_path.startswith(('/upload:', '/call:'))):
                    probe = run_application([runner, '-s', 'NativeAuthProbe', str(application)], input=b'', env=env, timeout=30)
                    if probe.returncode or not probe.stdout.startswith(b'Status: 204'):
                        self.send_error(401, 'Sign in required')
                        return
                closing = decoded_path == '/_weba/page-close'
                if closing:
                    env.update(PATH_INFO='/~logout', REQUEST_METHOD='GET', QUERY_STRING='', CONTENT_LENGTH='0', CONTENT_TYPE='')
                    body = b''
                command = ([runner, '-s', 'PublicAttachmentDownload', str(application)] if public_attachment else
                           [runner, '-s', 'RestApi', str(application)] if api else [runner, str(application)])
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
                        result = native_requests.run(command, input=body, env=env, timeout=30)
                else:
                    if command_text is not None:
                        env['QUERY_STRING'] = command_text
                    result = native_requests.run(command, input=body, env=env, timeout=30)
                if closing:
                    documents.forget(page_token)
                    self.send_response(204)
                    self.end_headers()
                    return
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
                                and pieces[:3] == ['api', 'attachment', 'download']) and not public_attachment:
                            raise RuntimeError('Invalid download metadata')
                        filename = base64.b64decode(value.strip(), validate=True).decode('utf-8')
                        parsed.append(('Content-Disposition', attachment_disposition(filename)))
                    elif key.lower() not in ['content-length', 'connection', 'transfer-encoding']:
                        parsed.append((key, value.strip()))
                if not api and (native or document):
                    parsed = [(key, value) for key, value in parsed if key.lower() not in ('cache-control', 'expires')]
                    parsed.append(('Cache-Control', 'no-store'))
                    if not closing:
                        documents.keep_peers(page_token, incoming, env, [runner, str(application)], native_requests)
                    documents.remember(page_token, parsed, incoming, page)
                    if document and status == 200 and any(key.lower() == 'content-type' and 'text/html' in value for key, value in parsed):
                        marker = ('<meta name="weba-page" content="' + page_token + '">').encode()
                        body = body.replace(b'<head>', b'<head>' + marker, 1)
                    secured = []
                    for key, value in parsed:
                        if key.lower() == 'set-cookie' and value.startswith('WEBA_UI_AUTH='):
                            value += '; SameSite=Lax; HttpOnly'
                            if environment.get('WEBA_PUBLIC_URL', '').startswith('https://'):
                                value += '; Secure'
                        secured.append((key, value))
                    parsed = secured
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
