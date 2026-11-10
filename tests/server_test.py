import base64
import errno
from email.message import Message
import io
import json
import os
import stat
import signal
import time
import tempfile
from types import SimpleNamespace
from unittest.mock import Mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import server


class PortHandler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        body = str(self.server.server_port).encode()
        self.send_response(200)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ServerPortTest(unittest.TestCase):
    def test_occupied_preferred_port_falls_back_to_a_serving_port(self):
        with ThreadingHTTPServer(('127.0.0.1', 0), PortHandler) as occupied:
            with server.bind_server('127.0.0.1', None, PortHandler, preferred_port=occupied.server_port) as available:
                self.assertNotEqual(available.server_port, occupied.server_port)
                self.assertGreater(available.server_port, 0)
                thread = threading.Thread(target=available.serve_forever, daemon=True)
                thread.start()
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{available.server_port}', timeout=5) as response:
                        self.assertEqual(response.read().decode(), str(available.server_port))
                finally:
                    available.shutdown()
                    thread.join(timeout=5)

    def test_explicit_occupied_port_is_not_silently_changed(self):
        with ThreadingHTTPServer(('127.0.0.1', 0), PortHandler) as occupied:
            with self.assertRaises(OSError) as caught:
                server.bind_server('127.0.0.1', occupied.server_port, PortHandler)
            self.assertEqual(caught.exception.errno, errno.EADDRINUSE)

    def test_explicit_zero_uses_an_os_assigned_port(self):
        with server.bind_server('127.0.0.1', 0, PortHandler) as available:
            self.assertGreater(available.server_port, 0)

    def test_unrelated_bind_errors_are_not_hidden(self):
        with patch.object(server, 'ThreadingHTTPServer', side_effect=OSError(errno.EACCES, 'permission denied')) as constructor:
            with self.assertRaises(PermissionError):
                server.bind_server('127.0.0.1', None, PortHandler)
            constructor.assert_called_once()


class CgiDeadlineTest(unittest.TestCase):
    def test_timeout_does_not_wait_for_descendant_inherited_output(self):
        with tempfile.TemporaryDirectory() as work:
            pid_file = Path(work) / 'child.pid'
            script = (
                'import subprocess,sys,time; '
                'child=subprocess.Popen([sys.executable,"-c","import time; time.sleep(60)"]); '
                'open(sys.argv[1],"w").write(str(child.pid)); '
                'time.sleep(60)'
            )
            started = time.monotonic()
            try:
                with self.assertRaises(server.subprocess.TimeoutExpired):
                    server.run_application([sys.executable, '-c', script, str(pid_file)],
                                           input=b'', env={**os.environ, 'TMPDIR': work}, timeout=1)
                self.assertTrue(pid_file.exists(), 'the descendant must actually have started')
                self.assertLess(time.monotonic() - started, 5,
                                'inherited output must not extend the process deadline')
            finally:
                if pid_file.exists():
                    try:
                        os.kill(int(pid_file.read_text()), signal.SIGTERM)
                    except ProcessLookupError:
                        pass

    def test_success_waits_for_delayed_descendant_body(self):
        script = (
            'import os,subprocess,sys; '
            'os.write(1,b"Content-Type: text/html\\r\\n\\r\\n"); '
            'subprocess.Popen([sys.executable,"-c",'
            '"import os,time; time.sleep(.15); os.write(1,b\\"<html><title>Complete</title></html>\\")"])'
        )
        result = server.run_application([sys.executable, '-c', script],
                                        input=b'', env=os.environ.copy(), timeout=5)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b'Content-Type: text/html\r\n\r\n<html><title>Complete</title></html>')

    def test_delayed_body_is_complete_over_http(self):
        with tempfile.TemporaryDirectory() as work:
            application = Path(work) / 'delayed.py'
            application.write_text(
                'import os,subprocess,sys\n'
                'os.write(1,b"Content-Type: text/html\\r\\n\\r\\n")\n'
                'subprocess.Popen([sys.executable,"-c",'
                '"import os,time; time.sleep(.15); os.write(1,b\\"<html><title>Complete</title></html>\\")"])\n'
            )
            env = {**os.environ, 'TMPDIR': work}
            with ThreadingHTTPServer(('127.0.0.1', 0), server.handler(application, sys.executable, env)) as host:
                thread = threading.Thread(target=host.serve_forever, daemon=True)
                thread.start()
                try:
                    with urllib.request.urlopen('http://127.0.0.1:' + str(host.server_port) + '/', timeout=5) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.read(), b'<html><title>Complete</title></html>')
                finally:
                    host.shutdown()
                    thread.join(timeout=5)

    @unittest.skipUnless(os.name == 'posix', 'POSIX detached-process deadline')
    def test_detached_descendant_cannot_extend_timeout(self):
        with tempfile.TemporaryDirectory() as work:
            pid_file = Path(work) / 'detached.pid'
            script = (
                'import subprocess,sys,time; '
                'child=subprocess.Popen([sys.executable,"-c","import time; time.sleep(60)"],start_new_session=True); '
                'open(sys.argv[1],"w").write(str(child.pid)); time.sleep(60)'
            )
            started = time.monotonic()
            try:
                with self.assertRaises(server.subprocess.TimeoutExpired):
                    server.run_application([sys.executable, '-c', script, str(pid_file)],
                                           input=b'', env={**os.environ, 'TMPDIR': work}, timeout=1)
                self.assertTrue(pid_file.exists())
                self.assertLess(time.monotonic() - started, 5)
            finally:
                if pid_file.exists():
                    try:
                        os.kill(int(pid_file.read_text()), signal.SIGTERM)
                    except ProcessLookupError:
                        pass

    def test_exited_parent_with_hung_writer_reaches_deadline(self):
        with tempfile.TemporaryDirectory() as work:
            pid_file = Path(work) / 'writer.pid'
            script = (
                'import os,subprocess,sys; os.write(1,b"Content-Type: text/html\\r\\n\\r\\n"); '
                'child=subprocess.Popen([sys.executable,"-c","import time; time.sleep(60)"]); '
                'open(sys.argv[1],"w").write(str(child.pid))'
            )
            started = time.monotonic()
            try:
                with self.assertRaises(server.subprocess.TimeoutExpired):
                    server.run_application([sys.executable, '-c', script, str(pid_file)],
                                           input=b'', env={**os.environ, 'TMPDIR': work}, timeout=1)
                self.assertTrue(pid_file.exists())
                self.assertLess(time.monotonic() - started, 5)
            finally:
                if pid_file.exists():
                    try:
                        os.kill(int(pid_file.read_text()), signal.SIGTERM)
                    except ProcessLookupError:
                        pass

    def test_success_returns_actual_cgi_output(self):
        result = server.run_application([sys.executable, '-c', 'print("Content-Type: text/plain\\r\\n\\r\\nOK",end="")'],
                                        input=b'', env=os.environ.copy(), timeout=5)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b'Content-Type: text/plain\r\n\r\nOK')


class NativeRequestCoordinatorTest(unittest.TestCase):
    def test_application_cookie_serializes_despite_extra_cookie_changes(self):
        coordinator = server.NativeRequestCoordinator()
        entered, release, second = threading.Event(), threading.Event(), threading.Event()
        results = []
        def run(command, **kwargs):
            if command == ['first']:
                entered.set()
                self.assertTrue(release.wait(3))
            else:
                second.set()
            return command
        with patch.object(server, 'run_application', side_effect=run):
            first = threading.Thread(target=lambda: results.append(coordinator.run(['first'], input=b'', env={'HTTP_COOKIE':'GBSESSIONID-57454B414E=shared; extra=one'}, timeout=3)))
            following = threading.Thread(target=lambda: results.append(coordinator.run(['second'], input=b'', env={'HTTP_COOKIE':'extra=two; GBSESSIONID-57454B414E=shared'}, timeout=3)))
            first.start()
            self.assertTrue(entered.wait(3))
            following.start()
            self.assertFalse(second.wait(.1))
            release.set()
            first.join(3)
            following.join(3)
        self.assertFalse(first.is_alive())
        self.assertFalse(following.is_alive())
        self.assertEqual(results, [['first'], ['second']])

    def test_api_and_anonymous_requests_bypass_native_lock(self):
        coordinator = server.NativeRequestCoordinator(stripes=1)
        coordinator.locks[0].acquire()
        try:
            with patch.object(server, 'run_application', return_value='ok') as runner:
                for env in [{'HTTP_COOKIE':'GBSESSIONID-57454B414E=shared','WEBA_API_REQUEST':'1'}, {}]:
                    self.assertEqual(coordinator.run(['cgi'], input=b'body', env=env, timeout=.01), 'ok')
                self.assertEqual(runner.call_count, 2)
                with self.assertRaisesRegex(RuntimeError, 'Native session busy'):
                    coordinator.run(['cgi'], input=b'', env={'HTTP_COOKIE':'GBSESSIONID-57454B414E=shared'}, timeout=.01)
        finally:
            coordinator.locks[0].release()

    def test_multiple_application_cookies_and_errors_release_all_locks(self):
        coordinator = server.NativeRequestCoordinator(stripes=1)
        with patch.object(server, 'run_application', side_effect=RuntimeError('private')):
            with self.assertRaisesRegex(RuntimeError, 'private'):
                coordinator.run(['cgi'], input=b'', env={'HTTP_COOKIE':'GBSESSIONID-41=one; GBSESSIONID-42=two'})
        self.assertTrue(coordinator.locks[0].acquire(blocking=False))
        coordinator.locks[0].release()

    def test_distinct_session_stripes_run_independently(self):
        coordinator = server.NativeRequestCoordinator()
        cookies = ['session'+str(i) for i in range(10)]
        stripe = lambda value: int.from_bytes(server.hashlib.sha256(value.encode()).digest()[:4], 'big') % len(coordinator.locks)
        other = next(value for value in cookies[1:] if stripe(value) != stripe(cookies[0]))
        coordinator.locks[stripe(cookies[0])].acquire()
        try:
            with patch.object(server, 'run_application', return_value='ok'):
                self.assertEqual(coordinator.run(['cgi'], input=b'', env={'HTTP_COOKIE':'GBSESSIONID-57454B414E='+other}, timeout=.01), 'ok')
        finally:
            coordinator.locks[stripe(cookies[0])].release()


class LoginThrottleTest(unittest.TestCase):
    def test_limit_window_success_reset_and_capacity(self):
        clock = [100.0]
        gate = server.LoginThrottle(clock=lambda: clock[0], limit=2, window=60, capacity=2)
        self.assertEqual(gate.admit('peer-a'), 0)
        self.assertEqual(gate.admit('peer-a'), 0)
        self.assertGreater(gate.admit('peer-a'), 0)
        self.assertEqual(gate.admit('peer-b'), 0)
        self.assertGreater(gate.admit('peer-c'), 0, 'capacity must not evict a blocked peer')
        gate.success('peer-a')
        self.assertEqual(gate.admit('peer-a'), 0)
        clock[0] += 61
        self.assertEqual(gate.admit('peer-c'), 0)
        self.assertLessEqual(len(gate.attempts), 2)


class AttachmentUploadTransportTest(unittest.TestCase):
    def test_unicode_normalization_preserves_payload_and_is_upload_only(self):
        expected = {'fileName': 'name 🚀 +.bin', 'fileType': 'application/octet-stream', 'fileData': 'AP8=', 'boardId': '1'}
        body = json.dumps(expected, ensure_ascii=True).encode()
        self.assertEqual(json.loads(server.canonical_upload_unicode(body)), expected)
        self.assertIn('🚀'.encode(), server.canonical_upload_unicode(body))
        for path, changed in [('/api/attachment/upload', True), ('/users/login', False), ('/api/boards/1/members/user', False)]:
            request = NativeOriginTest().request('POST', path, {'Content-Type': 'application/json', 'Content-Length': str(len(body))})
            request.rfile = io.BytesIO(body)
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1', 12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            result = SimpleNamespace(returncode=0, stdout=b'Content-Type: application/json\r\n\r\n{}')
            with patch.object(server, 'run_application', return_value=result) as runner:
                request._run_cgi()
            forwarded = runner.call_args.kwargs['input']
            self.assertEqual(forwarded, server.canonical_upload_unicode(body) if changed else body)
            self.assertEqual(int(runner.call_args.kwargs['env']['CONTENT_LENGTH']), len(forwarded))

    def test_absolute_body_deadline_rejects_a_dripping_client_and_restores_socket(self):
        request = NativeOriginTest().request('POST', '/api/attachment/upload')
        request.connection = Mock()
        request.connection.gettimeout.return_value = None
        request.rfile = Mock()
        request.rfile.read1.side_effect = [b'ab', b'cd']
        with patch.object(server.time, 'monotonic', side_effect=[0, 1, 2, 31]):
            with self.assertRaises(TimeoutError):
                request._read_body(6)
        self.assertEqual(request.rfile.read1.call_count, 2)
        self.assertEqual([call.args[0] for call in request.connection.settimeout.call_args_list], [29, 28, None])

    def test_incomplete_and_oversized_uploads_never_start_cgi(self):
        for length, status, message in [(3, 400, 'Request error'), (96*1024*1024+1, 413, 'Request payload exceeds server safety limit')]:
            request = NativeOriginTest().request('POST', '/api/attachment/upload', {'Content-Type': 'text/plain', 'Content-Length': str(length)})
            request.rfile = io.BytesIO(b'x')
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1', 12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            with patch.object(server, 'run_application') as runner:
                request._run_cgi()
            runner.assert_not_called()
            request.send_response.assert_called_with(status)
            self.assertTrue(request.close_connection)
            self.assertEqual(json.loads(request.wfile.getvalue()), {'success': False, 'error': message})

    def test_timeout_upload_answers_json_before_cgi(self):
        request = NativeOriginTest().request('POST', '/api/attachment/upload', {'Content-Type': 'text/plain', 'Content-Length': '10'})
        request.rfile = Mock()
        request.rfile.read1.side_effect = TimeoutError()
        request.wfile = io.BytesIO()
        request.client_address = ('127.0.0.1', 12345)
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        with patch.object(server, 'run_application') as runner:
            request._run_cgi()
        runner.assert_not_called()
        request.send_response.assert_called_with(408)
        self.assertEqual(json.loads(request.wfile.getvalue()), {'success': False, 'error': 'Request timeout'})

    def test_native_upload_larger_body_gate_still_requires_origin_header(self):
        cases = [
            ('/upload:@1.DetailUpload', 20*1024*1024+1, {}, 400, True),
            ('/upload:@1.DetailUpload', 96*1024*1024+1, {}, 413, False),
            ('/upload:@1.DetailUpload', 20*1024*1024+1, {'X-WeBa-Request': None}, 403, False),
            ('/upload:@1.DetailUpload', 20*1024*1024+1, {'Sec-Fetch-Site':'cross-site'}, 403, False),
            ('/api/boards/1', 20*1024*1024+1, {}, 413, False),
        ]
        for route,length,headers,status,read in cases:
            request = NativeOriginTest().request('POST',route,{'Content-Type':'application/octet-stream','Content-Length':str(length),**headers})
            request.rfile = Mock()
            request.rfile.read1.return_value = b''
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1',12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            with patch.object(server,'run_application') as runner:
                request._run_cgi()
            if status == 403:
                request.send_error.assert_called_once_with(status, 'Request origin not allowed')
            else:
                request.send_error.assert_called_once_with(status)
            self.assertEqual(request.rfile.read1.called,read)
            runner.assert_not_called()

    def test_malformed_and_unrelated_json_are_unchanged(self):
        for body in (b'{', b'[]', b'{"fileData":"YQ=="}', b'{"fileName":null}'):
            self.assertEqual(server.canonical_upload_unicode(body), body)


class AttachmentDownloadTransportTest(unittest.TestCase):
    def test_download_metadata_is_private_and_filename_headers_cannot_inject(self):
        filename = 'Résumé "quote"\r\nInjected: value.html'
        encoded = base64.b64encode(filename.encode()).decode()
        result = SimpleNamespace(returncode=0, stdout=(f"Status: 200\r\nContent-Type: text/html\r\nX-WeBa-Download-Name: {encoded}\r\n\r\n".encode() + b'\x00\xff<script>never run</script>'))
        for route in ('/api/attachment/download/1?raw=1','/api/attachment/info/1','/'):
            request = NativeOriginTest().request('GET', route)
            request.rfile = io.BytesIO()
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1',12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            with patch.object(server, 'run_application', return_value=result):
                request._run_cgi()
            headers = [call.args for call in request.send_header.call_args_list]
            self.assertFalse(any(key.lower()=='x-weba-download-name' for key,value in headers))
            if '/download/' in route:
                request.send_error.assert_not_called()
                disposition = dict(headers)['Content-Disposition']
                self.assertEqual(disposition, server.attachment_disposition(filename))
                self.assertNotIn('\r', disposition)
                self.assertNotIn('\n', disposition)
                self.assertEqual(request.wfile.getvalue(), b'\x00\xff<script>never run</script>')
            else:
                request.send_error.assert_called_once_with(500,'Gambas request failed')
                self.assertEqual(request.wfile.getvalue(), b'')

    def test_binary_body_delimiters_do_not_replace_the_real_cgi_header_boundary(self):
        body = b'\x00\xffbinary\r\n\r\nembedded\n\nbytes'
        for newline in (b'\n', b'\r\n'):
            request = NativeOriginTest().request('GET','/api/attachment/download/1?raw=1')
            request.rfile = io.BytesIO()
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1',12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            result = SimpleNamespace(returncode=0,stdout=newline.join([b'Status: 200',b'Content-Type: application/octet-stream',b'X-WeBa-Download-Name: ZmlsZS5iaW4=',b'',b''])+body)
            with patch.object(server,'run_application',return_value=result):
                request._run_cgi()
            request.send_error.assert_not_called()
            self.assertEqual(request.wfile.getvalue(), body)

    def test_malformed_download_metadata_does_not_reach_client(self):
        for encoded in ('not base64', base64.b64encode(b'\xff').decode()):
            request = NativeOriginTest().request('GET','/api/attachment/download/1?raw=1')
            request.rfile = io.BytesIO()
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1',12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            result = SimpleNamespace(returncode=0,stdout=f'Status: 200\r\nX-WeBa-Download-Name: {encoded}\r\n\r\nprivate'.encode())
            with patch.object(server,'run_application',return_value=result):
                request._run_cgi()
            request.send_error.assert_called_once_with(500,'Gambas request failed')
            self.assertEqual(request.wfile.getvalue(), b'')


class CardDateTransportTest(unittest.TestCase):
    def test_numeric_timeclip_is_exact_and_does_not_change_other_fields(self):
        body = b'{"dueAt":8640000000000000.0,"startAt":-1.9,"receivedAt":0.9999999999999999,"endAt":-0.0,"members":["owner"],"other":1.25}'
        data = json.loads(server.canonical_card_dates(body))
        self.assertEqual(data, {'dueAt': 8640000000000000, 'startAt': -1, 'receivedAt': 0, 'endAt': 0, 'members': ['owner'], 'other': 1.25})
        self.assertIs(type(data['dueAt']), int)

    def test_escaped_supplementary_description_is_forwarded_as_utf8(self):
        expected = {'description': 'Kept ää 中文 😀', 'members': ['owner'], 'dueAt': None}
        encoded = json.dumps(expected, ensure_ascii=True).encode()
        actual = server.canonical_card_dates(encoded)
        self.assertIn('😀'.encode(), actual)
        self.assertEqual(json.loads(actual), expected)
        self.assertEqual(json.loads(server.canonical_card_dates(json.dumps(expected, ensure_ascii=False).encode())), expected)

    def test_invalid_numeric_dates_do_not_turn_into_clears(self):
        data = json.loads(server.canonical_card_dates(b'{"dueAt":1e309,"endAt":8640000000000001,"members":["owner"]}'))
        self.assertEqual(data, {'dueAt': {}, 'endAt': {}, 'members': ['owner']})

    def test_non_numeric_and_malformed_bodies_are_unchanged(self):
        for body in (b'{"dueAt":null}', b'{"dueAt":true}', b'{"dueAt":"null"}', b'{"dueAt":"8640000000000000"}',
                     b'{"members":[1.25]}', b'[]', b'{"dueAt":NaN}', b'{"dueAt":undefined}', b'{'):
            with self.subTest(body=body):
                self.assertEqual(server.canonical_card_dates(body), body)

    def test_normalization_cannot_bypass_the_original_body_size_gate(self):
        body = b'{"dueAt":0.0' + b' ' * 1048576 + b'}'
        self.assertEqual(server.canonical_card_dates(body), body)

    def test_cgi_gets_reencoded_length_only_on_card_put(self):
        body = b'{"dueAt":8640000000000000.0}'
        for method, path, changed in [('PUT', '/api/boards/1/lists/2/cards/3', True),
                                      ('POST', '/api/boards/1/lists/2/cards/3', False),
                                      ('PUT', '/api/boards/1/members/owner', False)]:
            request = NativeOriginTest().request(method, path, {'Content-Type': 'application/json', 'Content-Length': str(len(body))})
            request.rfile = io.BytesIO(body)
            request.wfile = io.BytesIO()
            request.client_address = ('127.0.0.1', 12345)
            request.send_response = Mock()
            request.send_header = Mock()
            request.end_headers = Mock()
            result = SimpleNamespace(returncode=0, stdout=b'Content-Type: application/json\r\n\r\n{}')
            with patch.object(server, 'run_application', return_value=result) as runner:
                request._run_cgi()
            forwarded = runner.call_args.kwargs['input']
            self.assertEqual(forwarded, server.canonical_card_dates(body) if changed else body)
            self.assertEqual(int(runner.call_args.kwargs['env']['CONTENT_LENGTH']), len(forwarded))


class NativeOriginTest(unittest.TestCase):
    def request(self, method='POST', path='/x', headers=None, environment=None):
        documents = server.NativeDocuments()
        documents.remember('test-page', [('Set-Cookie', 'GBSESSIONID=test-native; Path=/')], '')
        with patch.object(server, 'NativeDocuments', return_value=documents):
            cls = server.handler(Path('/unused.gambas'), 'unused-runner', environment or {})
        request = object.__new__(cls)
        request.path = path
        request.command = method
        request.headers = Message()
        defaults = {'Host': '127.0.0.1:8080', 'X-WeBa-Request': '1',
                    'X-WeBa-Page': 'test-page', 'Cookie': 'GBSESSIONID=test-native',
                    'Content-Type': 'application/x-www-form-urlencoded'}
        defaults.update(headers or {})
        for key, value in defaults.items():
            if value is not None:
                request.headers[key] = value
        request.server = SimpleNamespace(server_address=('127.0.0.1', 8080), server_port=8080)
        request.send_error = Mock()
        return request

    def test_same_origin_and_non_browser_native_requests_are_allowed(self):
        for headers in [{}, {'Origin': 'http://127.0.0.1:8080'},
                        {'Referer': 'http://127.0.0.1:8080/', 'Sec-Fetch-Site': 'same-origin'}]:
            request = self.request(headers=headers)
            self.assertTrue(request._request_allowed(server.urllib.parse.urlsplit(request.path)))
            request.send_error.assert_not_called()

    def test_cross_origin_simple_and_malformed_requests_never_reach_gambas(self):
        cases = [
            ('GET', '/x?c=private', {}, 405),
            ('POST', '/x', {'X-WeBa-Request': None}, 403),
            ('POST', '/x', {'Content-Type': 'text/plain'}, 403),
            ('POST', '/x?c=private', {}, 403),
            ('POST', '/x', {'Origin': 'null'}, 403),
            ('POST', '/x', {'Origin': 'http://attacker.invalid'}, 403),
            ('POST', '/x', {'Origin': 'http://127.0.0.1:9999'}, 403),
            ('POST', '/x', {'Referer': 'http://attacker.invalid/'}, 403),
            ('POST', '/x', {'Sec-Fetch-Site': 'same-site'}, 403),
            ('POST', '/x', {'Sec-Fetch-Site': 'cross-site'}, 403),
            ('POST', '/x', {'Host': 'rebinding.attacker.invalid:8080'}, 403),
            ('POST', '/x', {'Host': '127.0.0.1:8080@attacker.invalid'}, 403),
            ('POST', '/upload:123', {'X-WeBa-Request': None}, 403),
            ('POST', '/call:1', {'Origin': 'http://attacker.invalid'}, 403),
            ('GET', '/%78?c=private', {}, 405),
        ]
        for method, path, headers, status in cases:
            with self.subTest(method=method, path=path, headers=headers):
                request = self.request(method, path, headers)
                with patch.object(server, 'run_application') as runner:
                    request._run_cgi()
                self.assertEqual(request.send_error.call_args.args[0], status)
                runner.assert_not_called()

    def test_large_command_bridge_is_private_and_deleted_after_success_or_failure(self):
        command = json.dumps(['update', '@1.Description', 'text', 'private text ' * 10000, True])
        body = server.urllib.parse.urlencode({'c': command}).encode()
        for fail in [False, True]:
            with self.subTest(fail=fail), tempfile.TemporaryDirectory() as work:
                request = self.request(headers={'Content-Length': str(len(body))},
                                       environment={'TMPDIR': work})
                request.rfile = io.BytesIO(body)
                request.wfile = io.BytesIO()
                request.client_address = ('127.0.0.1', 12345)
                request.send_response = Mock()
                request.send_header = Mock()
                request.end_headers = Mock()
                paths = []

                def run(*args, **kwargs):
                    env = kwargs['env']
                    private = Path(env['WEBA_COMMAND_FILE'])
                    paths.append(private)
                    self.assertEqual(stat.S_IMODE(private.stat().st_mode), 0o600)
                    self.assertEqual(private.read_text(), command)
                    self.assertLess(len(env['QUERY_STRING']), 1024)
                    self.assertNotIn('private text', str(args))
                    self.assertNotIn('private text', str(env))
                    if fail:
                        raise server.subprocess.TimeoutExpired(args[0], 30)
                    return SimpleNamespace(returncode=0, stdout=b'Content-Type: text/plain\r\n\r\nOK')

                with patch.object(server, 'run_application', side_effect=run):
                    request._run_cgi()
                self.assertTrue(paths)
                self.assertTrue(all(not path.exists() for path in paths))
                if fail:
                    request.send_error.assert_called_once_with(500, 'Gambas request failed')
                else:
                    request.send_error.assert_not_called()

    def test_command_body_reaches_gambas_without_plus_encoding_corruption(self):
        command = '["update", "@1.WebTextPass", "text", "secret + & ä", true]'
        body = server.urllib.parse.urlencode({'c': command}).encode()
        request = self.request(headers={'Content-Length': str(len(body))})
        request.rfile = io.BytesIO(body)
        request.wfile = io.BytesIO()
        request.client_address = ('127.0.0.1', 12345)
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        result = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/plain\r\n\r\nOK')
        with patch.object(server, 'run_application', return_value=result) as runner:
            request._run_cgi()
        env = runner.call_args.kwargs['env']
        self.assertEqual(server.urllib.parse.parse_qs(env['QUERY_STRING'])['c'], [command])
        self.assertNotIn('+', env['QUERY_STRING'], 'Gambas query decoding does not treat + as whitespace')
        self.assertEqual(env['CONTENT_LENGTH'], '0')
        self.assertEqual(runner.call_args.kwargs['input'], b'')
        self.assertEqual(request.wfile.getvalue(), b'OK')

    def test_explicit_public_origin_works_for_reverse_proxy_without_trusting_forwarded_headers(self):
        request = self.request(headers={'Host': 'weba.example', 'Origin': 'https://weba.example'},
                               environment={'WEBA_PUBLIC_URL': 'https://weba.example'})
        self.assertTrue(request._request_allowed(server.urllib.parse.urlsplit('/x')))
        request = self.request(headers={'Host': 'weba.example', 'Origin': 'https://weba.example'})
        self.assertFalse(request._request_allowed(server.urllib.parse.urlsplit('/x')))


class AllBoardsEntryTest(unittest.TestCase):
    def request(self, path, method='GET'):
        request = NativeOriginTest().request(method, path)
        request.rfile = io.BytesIO()
        request.wfile = io.BytesIO()
        request.client_address = ('127.0.0.1', 12345)
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        return request

    def test_entry_routes_reach_only_root_html_with_no_query_commands(self):
        result = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/html\r\n\r\n<html>entry</html>')
        for section in ('remaining', 'starred', 'archive', 'home', 'workspaces', 'workspaces/parent/child', 'workspaces//parent///child'):
            for path in ('/allboards/' + section, '/allboards/' + section + '/', '/%61llboards/' + section):
                with self.subTest(path=path):
                    request = self.request(path + '?c=forged-command&native=canary')
                    with patch.object(server, 'run_application', return_value=result) as run:
                        request._run_cgi()
                    request.send_error.assert_not_called()
                    env = run.call_args.kwargs['env']
                    self.assertEqual(env['PATH_INFO'], '/')
                    self.assertEqual(env['QUERY_STRING'], '')
                    self.assertEqual(env['WEBA_API_REQUEST'], '0')
                    self.assertEqual(request.wfile.getvalue(), b'<html>entry</html>')

    def test_entry_routes_cannot_be_mutation_or_multiply_encoded_aliases(self):
        for path, method, code in [('/allboards/home', 'POST', 405), ('/allboards/home/child', 'GET', 404), ('/allboards/starred', 'POST', 405), ('/allboards/archive', 'DELETE', 405), ('/%2561llboards/starred', 'GET', 404), ('/allboards/%252e%252e/private', 'GET', 404), ('/allboards/workspaces/%ZZ', 'GET', 404), ('/allboards/workspaces/%FF', 'GET', 404)]:
            with self.subTest(path=path, method=method):
                request = self.request(path, method)
                with patch.object(server, 'run_application') as run:
                    request._run_cgi()
                request.send_error.assert_called_once_with(code)
                run.assert_not_called()

    def test_board_entries_are_readonly_root_shells_without_query_commands(self):
        result = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/html\r\n\r\n<html>entry</html>')
        for path in ('/b/1', '/b/1/', '/b/2147483647/board', '/b/1/name/', '/%62/1/slug', '/b/1/%E8%88%B9'):
            with self.subTest(path=path):
                request = self.request(path + '?c=forged-command&private=canary')
                with patch.object(server, 'run_application', return_value=result) as run:
                    request._run_cgi()
                request.send_error.assert_not_called()
                env = run.call_args.kwargs['env']
                self.assertEqual(env['PATH_INFO'], '/')
                self.assertEqual(env['QUERY_STRING'], '')
                self.assertEqual(env['WEBA_API_REQUEST'], '0')

    def test_board_entries_reject_invalid_aliases_and_mutation_methods(self):
        for path, method, code in [('/b/1/slug', 'POST', 405), ('/b/1', 'DELETE', 405), ('/b', 'GET', 404), ('/b/0', 'GET', 404), ('/b/01/name', 'GET', 404), ('/b/2147483648/name', 'GET', 404), ('/b/-1/name', 'GET', 404), ('/b/1/slug/card', 'GET', 404), ('/b/1/%252e%252e', 'GET', 404), ('/b/1/%ZZ', 'GET', 404), ('/b/1/%FF', 'GET', 404)]:
            with self.subTest(path=path, method=method):
                request = self.request(path, method)
                with patch.object(server, 'run_application') as run:
                    request._run_cgi()
                request.send_error.assert_called_once_with(code)
                run.assert_not_called()


class DevelopmentRouteTest(unittest.TestCase):
    def test_debug_routes_are_rejected_before_starting_gambas(self):
        cls = server.handler(Path('/unused.gambas'), 'unused-runner',
                             {'WEBA_DB_PASSWORD': 'must-not-leak'})
        for path in ['/~dump', '/~dump?secret=1', '/%7Edump', '/%257Edump', '/~logout',
                     '/../private.txt', '/%2e%2e/private.txt', '/%252e%252e/private.txt',
                     '/icon:../private.txt', '/lib:../private.js', '/.../private.txt',
                     '/%5c..%5cprivate.txt', '/%00private.txt', '/%2525252e%2525252e/private.txt']:
            with self.subTest(path=path):
                request = object.__new__(cls)
                request.path = path
                request.send_error = Mock()
                with patch.object(server, 'run_application') as runner:
                    request._run_cgi()
                request.send_error.assert_called_once_with(404)
                runner.assert_not_called()


class DisconnectedClientTest(unittest.TestCase):
    def request(self, write_error, cgi_failure=False):
        cls = server.handler(Path('/unused.gambas'), 'unused-runner', {})
        request = object.__new__(cls)
        request.path = '/'
        request.command = 'GET'
        request.headers = {'Host': '127.0.0.1:8080'}
        request.server = SimpleNamespace(server_address=('127.0.0.1', 8080), server_port=8080)
        request.client_address = ('127.0.0.1', 12345)
        request.rfile = io.BytesIO()
        request.wfile = Mock()
        request.wfile.write.side_effect = write_error
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        request.send_error = Mock(side_effect=write_error if cgi_failure else None)
        result = SimpleNamespace(returncode=1 if cgi_failure else 0,
                                 stdout=b'Content-Type: text/plain\r\n\r\nOK')
        with patch.object(server, 'run_application', return_value=result):
            request.run_cgi()
        self.assertTrue(request.close_connection)
        return request

    def test_disconnected_response_does_not_attempt_a_second_response(self):
        for error in [BrokenPipeError(), ConnectionResetError(), ConnectionAbortedError()]:
            with self.subTest(error=type(error).__name__):
                self.request(error).send_error.assert_not_called()

    def test_disconnect_while_reporting_cgi_failure_is_silent(self):
        request = self.request(BrokenPipeError(), cgi_failure=True)
        request.send_error.assert_called_once_with(500, 'Gambas request failed')


if __name__ == '__main__': unittest.main()
