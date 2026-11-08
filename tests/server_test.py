import errno
from email.message import Message
import io
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


class NativeOriginTest(unittest.TestCase):
    def request(self, method='POST', path='/x', headers=None, environment=None):
        cls = server.handler(Path('/unused.gambas'), 'unused-runner', environment or {})
        request = object.__new__(cls)
        request.path = path
        request.command = method
        request.headers = Message()
        defaults = {'Host': '127.0.0.1:8080', 'X-WeBa-Request': '1',
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
                with patch.object(server.subprocess, 'run') as runner:
                    request._run_cgi()
                self.assertEqual(request.send_error.call_args.args[0], status)
                runner.assert_not_called()

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
        with patch.object(server.subprocess, 'run', return_value=result) as runner:
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


class DevelopmentRouteTest(unittest.TestCase):
    def test_debug_routes_are_rejected_before_starting_gambas(self):
        cls = server.handler(Path('/unused.gambas'), 'unused-runner',
                             {'WEBA_DB_PASSWORD': 'must-not-leak'})
        for path in ['/~dump', '/~dump?secret=1', '/%7Edump', '/%257Edump', '/~logout']:
            with self.subTest(path=path):
                request = object.__new__(cls)
                request.path = path
                request.send_error = Mock()
                with patch.object(server.subprocess, 'run') as runner:
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
        with patch.object(server.subprocess, 'run', return_value=result):
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
