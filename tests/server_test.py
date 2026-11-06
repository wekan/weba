import errno
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


class DisconnectedClientTest(unittest.TestCase):
    def request(self, write_error, cgi_failure=False):
        cls = server.handler(Path('/unused.gambas'), 'unused-runner', {})
        request = object.__new__(cls)
        request.path = '/'
        request.command = 'GET'
        request.headers = {}
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
