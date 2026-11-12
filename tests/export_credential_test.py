"""URL credentials are scoped to supported export routes and never reach CGI."""
import hashlib
import io
from types import SimpleNamespace
from unittest.mock import Mock, patch
from pathlib import Path
import sys
import unittest
import urllib.parse
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import server


class ExportCredentialTest(unittest.TestCase):
    def test_canonical_route_scope(self):
        for path in ['/api/boards/1/attachments/2/export', '/api/boards/a/attachments/b/export/']:
            self.assertTrue(server.is_attachment_export_path(path))
        for path in ['/api/attachment/download/2', '/api/boards/1/export',
                     '/api/boards//attachments/2/export', '/api/boards/1/attachments//export',
                     '/api/boards/1//attachments/2/export', '/api/boards/1/attachments/2/export//',
                     '/other/api/boards/1/attachments/2/export', '/API/boards/1/attachments/2/export']:
            self.assertFalse(server.is_attachment_export_path(path))

    def test_issue_route_scope_and_fields(self):
        for name in ['github', 'gitea', 'forgejo', 'gitlab', 'trello', 'deck', 'kanboard', 'markdown', 'leo']:
            for suffix in ['', '/']:
                self.assertTrue(server.is_issue_export_path('/api/boards/1/export/' + name + suffix))
        for path in ['/api/boards/1/export/unknown', '/api/boards/1/export/github//',
                     '/API/boards/1/export/github', '/api/boards//export/github',
                     '/other/api/boards/1/export/github']:
            self.assertFalse(server.is_issue_export_path(path))
        for query, expected in [('fields=labels', 'labels'), ('fields=labels,dates', 'labels,dates'),
                                ('fields=labels&fields=dates', ''), ('fields[x]=labels', ''),
                                ('fields=labels&fields[x]=dates', ''), ('', '')]:
            self.assertEqual(server.issue_export_fields(query), expected)

    def test_digest_and_scrub(self):
        token = 'Ab09-_' * 7 + 'z'
        clean, state, digest = server.attachment_export_credential('x=keep&%61uthToken=' + token + '&other=%2B')
        self.assertEqual(state, 'token')
        self.assertEqual(digest, hashlib.sha256(token.encode()).hexdigest())
        self.assertNotIn(token, clean)
        self.assertEqual(urllib.parse.parse_qsl(clean), [('x', 'keep'), ('other', '+')])

    def test_absent_and_blank(self):
        for query in ['', 'authToken', 'authToken=', 'x=1&authToken=']:
            clean, state, digest = server.attachment_export_credential(query)
            self.assertEqual((state, digest), ('none', ''))
            self.assertNotIn('authToken', clean)

    def test_invalid_ambiguous_and_bounded(self):
        cases = [('authToken=wrong', 'invalid'), ('authToken=' + '+' * 43, 'invalid'),
                 ('authToken=x&authToken=y', 'bad-query'), ('authToken=&authToken=', 'bad-query'),
                 ('authToken[]=private', 'bad-query'), ('authToken[x]=private', 'bad-query'),
                 ('authToken=' + 'x' * 10001, 'too-long'),
                 ('authToken=' + urllib.parse.quote('😀' * 5001), 'too-long'),
                 ('&'.join(['x=1'] * 1001) + '&authToken=private', 'bad-query')]
        for query, expected in cases:
            clean, state, digest = server.attachment_export_credential(query)
            self.assertEqual((state, digest), (expected, ''))
            self.assertNotIn('authToken', clean)
            self.assertNotIn('private', clean)

    def test_actual_cgi_boundary_scrubs_query_and_enforces_precedence(self):
        from server_test import NativeOriginTest
        query_token = 'q' * 43
        header_token = 'h' * 43
        cases = [(query_token, 'token', hashlib.sha256(query_token.encode()).hexdigest()),
                 ('invalid', 'invalid', ''),
                 ('unused&authToken[]=' + query_token, 'bad-query', ''),
                 ('', 'none', hashlib.sha256(header_token.encode()).hexdigest())]
        for value, state, digest in cases:
            for path in ['/api/boards/1/attachments/2/export', '/api/boards/1/export/github', '/api/boards/1/export/gitea', '/api/boards/1/export/forgejo', '/api/boards/1/export/gitlab', '/api/boards/1/export/trello', '/api/boards/1/export/deck', '/api/boards/1/export/kanboard', '/api/boards/1/export/markdown', '/api/boards/1/export/leo']:
                self.check_boundary(path, value, state, digest, query_token, header_token)

    def check_boundary(self, path, value, state, digest, query_token, header_token):
        from server_test import NativeOriginTest
        request = NativeOriginTest().request('GET',
            path + '?x=keep&authToken=' + value,
            {'Authorization': 'Bearer ' + header_token})
        request.rfile = io.BytesIO()
        request.wfile = io.BytesIO()
        request.client_address = ('127.0.0.1', 12345)
        request.send_response = Mock()
        request.send_header = Mock()
        request.end_headers = Mock()
        result = SimpleNamespace(returncode=0, stdout=b'Content-Type: application/json\r\n\r\n{}')
        with patch.object(server, 'run_application', return_value=result) as runner:
            request._run_cgi()
        env = runner.call_args.kwargs['env']
        self.assertEqual(env['QUERY_STRING'], 'x=keep')
        self.assertEqual(env['WEBA_EXPORT_QUERY_STATE'], state)
        self.assertEqual(env['WEBA_API_TOKEN_DIGEST'], digest)
        self.assertEqual(env['WEBA_EXPORT_HEADER_PRESENT'], '1')
        self.assertNotIn(query_token, repr(env))
        self.assertNotIn(header_token, repr(env))
        self.assertEqual(runner.call_args.kwargs['input'], b'')
