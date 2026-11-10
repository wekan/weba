"""Per-document routing is not authentication, including native bypass paths."""
import io
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import server
import server_test

class NativeDocumentsTest(unittest.TestCase):
    def test_cookie_binding_and_independent_gui_selection(self):
        documents = server.NativeDocuments()
        auth = 'WEBA_UI_AUTH=' + 'a' * 43
        documents.remember('page-a', [('Set-Cookie', 'GBSESSIONID-ABC=gui-a')], auth)
        documents.remember('page-b', [('Set-Cookie', 'GBSESSIONID-ABC=gui-b')], auth)
        a = documents.select('page-a', auth)
        b = documents.select('page-b', auth)
        self.assertNotEqual(a['cookie'], b['cookie'])
        self.assertIsNone(documents.select('page-a', ''))
        self.assertIsNone(documents.select('page-a', 'WEBA_UI_AUTH=' + 'b' * 43))
        self.assertIsNone(documents.select('page-a', 'WEBA_UI_AUTH=malformed'))
        header = documents.cookie_header(auth + '; GBSESSIONID-ABC=gui-b; GBSESSIONID=foreign', a)
        self.assertEqual(documents.cookies(header)['GBSESSIONID-ABC'].value, 'gui-a')
        self.assertNotIn('GBSESSIONID', documents.cookies(header))
        self.assertNotIn('GBSESSIONID-ABC', documents.cookies(documents.cookie_header(header, None)))
        documents.forget('page-a')
        self.assertIsNone(documents.select('page-a', auth))
        self.assertIsNotNone(documents.select('page-b', auth))

    def test_regular_peer_activity_preserves_passive_pulse_cadence(self):
        documents = server.NativeDocuments()
        auth = 'WEBA_UI_AUTH=' + 'a' * 43
        for token in ('first', 'second'):
            documents.remember(token, [('Set-Cookie', 'GBSESSIONID=' + token)], auth)
        with patch.object(server.threading, 'Thread') as thread:
            documents.keep_peers('first', auth, {}, ['runner', 'app'], Mock())
            self.assertEqual(thread.call_count, 1)
            peer = documents.select('second', auth)
            documents.remember('second', [], auth, peer)
            documents.keep_peers('first', auth, {}, ['runner', 'app'], Mock())
            self.assertEqual(thread.call_count, 1, 'Ordinary peer responses must not reset the passive-pulse interval')

    def test_login_rotation_and_logout_do_not_rebind_other_documents(self):
        documents = server.NativeDocuments()
        documents.remember('login', [('Set-Cookie', 'GBSESSIONID=guest')], '')
        old = documents.select('login', '')
        auth = 'WEBA_UI_AUTH=' + 'a' * 43
        documents.remember('login', [('Set-Cookie', auth + '; HttpOnly')], '', old)
        self.assertIsNone(documents.select('login', ''))
        signed_in = documents.select('login', auth)
        self.assertTrue(signed_in['authenticated'])
        documents.remember('login', [('Set-Cookie', 'WEBA_UI_AUTH=; Max-Age=0')], auth, signed_in)
        self.assertIsNone(documents.select('login', auth))
        self.assertTrue(documents.select('login', '')['authenticated'])

    def test_passive_keepalive_uses_clean_payload_and_selected_peer(self):
        documents = server.NativeDocuments()
        auth = 'WEBA_UI_AUTH=' + 'a' * 43
        for token in ('first', 'second'):
            documents.remember(token, [('Set-Cookie', 'GBSESSIONID=' + token)], auth)
        coordinator = Mock()
        coordinator.run.return_value = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/javascript\n\n')
        with patch.object(server.threading, 'Thread') as thread:
            documents.keep_peers('first', auth, {'WEBA_COMMAND_FILE': '/private/large-command', 'QUERY_STRING': 'password', 'CONTENT_LENGTH': '90000'}, ['runner', 'app'], coordinator)
            work = thread.call_args.kwargs['target']
            work()
        forwarded = coordinator.run.call_args.kwargs
        self.assertEqual(forwarded['input'], b'')
        env = forwarded['env']
        self.assertEqual(env['WEBA_COMMAND_FILE'], '')
        self.assertEqual(env['CONTENT_LENGTH'], '0')
        self.assertEqual(env['WEBA_NATIVE_PASSIVE'], '1')
        self.assertEqual(documents.cookies(env['HTTP_COOKIE'])['GBSESSIONID'].value, 'second')
        self.assertNotIn('password', env['QUERY_STRING'])
        self.assertEqual(server.urllib.parse.parse_qs(env['QUERY_STRING'])['c'], ['["weba-passive"]'])
        with patch.object(server.threading, 'Thread') as thread:
            documents.keep_peers('first', auth, {}, ['runner', 'app'], coordinator)
            thread.assert_not_called()

    def test_dead_peer_gui_is_removed_instead_of_kept_alive_forever(self):
        documents = server.NativeDocuments()
        auth = 'WEBA_UI_AUTH=' + 'a' * 43
        for token in ('first', 'dead'):
            documents.remember(token, [('Set-Cookie', 'GBSESSIONID=' + token)], auth)
        coordinator = Mock()
        coordinator.run.return_value = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/javascript\n\nwindow.location.reload(true)')
        with patch.object(server.threading, 'Thread') as thread:
            documents.keep_peers('first', auth, {}, ['runner', 'app'], coordinator)
            thread.call_args.kwargs['target']()
        self.assertIsNone(documents.select('dead', auth), 'An expired GUI must not retain a recurring passive-pulse lease')
        self.assertIsNotNone(documents.select('first', auth))

    def request(self, method, path, headers=None, environment=None):
        request = server_test.NativeOriginTest().request(method, path, headers, environment)
        request.rfile, request.wfile = io.BytesIO(b'c=%5B%5D'), io.BytesIO()
        request.client_address = ('127.0.0.1', 12345)
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        return request

    def test_unknown_or_foreign_document_cannot_dispatch(self):
        for headers in ({'X-WeBa-Page': 'unknown'}, {'Cookie': 'WEBA_UI_AUTH=' + 'a' * 43}):
            request = self.request('POST', '/x', headers)
            with patch.object(server, 'run_application') as run:
                request._run_cgi()
            run.assert_not_called()
            self.assertEqual(request.wfile.getvalue(), b'location.reload(true);')

    def test_callback_probe_denies_before_native_callback_dispatch(self):
        for path in ('/c', '/call:callback', '/upload:control'):
            request = self.request('POST', path)
            result = SimpleNamespace(returncode=0, stdout=b'Status: 401 Unauthorized\n\n')
            with patch.object(server, 'run_application', return_value=result) as run:
                request._run_cgi()
            self.assertEqual(run.call_count, 1)
            self.assertIn('NativeAuthProbe', run.call_args.args[0])
            request.send_error.assert_called_once_with(401, 'Sign in required')

    def test_closing_gui_does_not_forward_logout_cookies_or_redirect(self):
        request = self.request('POST', '/_weba/page-close')
        result = SimpleNamespace(returncode=0, stdout=b'Set-Cookie: GBSESSIONID=; Max-Age=0\nLocation: /\n\n')
        with patch.object(server, 'run_application', return_value=result) as run:
            request._run_cgi()
        self.assertEqual(run.call_args.kwargs['env']['PATH_INFO'], '/~logout')
        request.send_response.assert_called_once_with(204)
        request.send_header.assert_not_called()
        self.assertEqual(request.wfile.getvalue(), b'')

    def test_https_shared_cookie_flags_and_private_response_cache(self):
        request = self.request('GET', '/', {'Host': 'boards.example', 'X-WeBa-Page': None},
                               {'WEBA_PUBLIC_URL': 'https://boards.example'})
        secret = 'a' * 43
        result = SimpleNamespace(returncode=0, stdout=(
            'Content-Type: text/html\nSet-Cookie: GBSESSIONID=fresh\n'
            'Set-Cookie: WEBA_UI_AUTH=' + secret + '; Path=/\n'
            'Cache-Control: public\n\n<html><head></head><body></body></html>').encode())
        with patch.object(server, 'run_application', return_value=result):
            request._run_cgi()
        headers = [call.args for call in request.send_header.call_args_list]
        cookie = next(value for key, value in headers if key.lower() == 'set-cookie' and value.startswith('WEBA_UI_AUTH='))
        for flag in ('HttpOnly', 'Secure', 'SameSite=Lax'):
            self.assertIn(flag, cookie)
        self.assertIn(('Cache-Control', 'no-store'), headers)
        self.assertNotIn(('Cache-Control', 'public'), headers)
        self.assertNotIn(secret.encode(), request.wfile.getvalue())

    def test_full_navigation_discards_gui_cookie_but_keeps_shared_auth(self):
        request = self.request('GET', '/', {'X-WeBa-Page': None, 'Cookie': 'GBSESSIONID=stale; WEBA_UI_AUTH=' + 'a' * 43})
        result = SimpleNamespace(returncode=0, stdout=b'Content-Type: text/html\nSet-Cookie: GBSESSIONID=fresh\n\n<html><head></head><body></body></html>')
        with patch.object(server, 'run_application', return_value=result) as run:
            request._run_cgi()
        env = run.call_args.kwargs['env']
        self.assertNotIn('GBSESSIONID', server.NativeDocuments.cookies(env['HTTP_COOKIE']))
        self.assertTrue(env['WEBA_NATIVE_AUTH_DIGEST'])
        self.assertIn(b'<meta name="weba-page"', request.wfile.getvalue())

if __name__ == '__main__':
    unittest.main()
