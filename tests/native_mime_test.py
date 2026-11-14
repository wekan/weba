"""Native MIME fallback boundaries; use synthetic private data only."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'runtime'))
import mime_policy


class NativeMimeTest(unittest.TestCase):
    def detector(self, work, body):
        script = Path(work) / 'file'
        script.write_text('#!' + sys.executable + '\n' + body + '\n')
        script.chmod(0o700)

    def test_exact_private_header_cap_and_arguments(self):
        with tempfile.TemporaryDirectory() as work:
            trace = Path(work) / 'trace.json'
            self.detector(work, 'import sys,json,hashlib\ndata=sys.stdin.buffer.read()\n'
                          f'open({str(trace)!r},"w").write(json.dumps({{"args":sys.argv[1:],"size":len(data),"hash":hashlib.sha256(data).hexdigest()}}))\n'
                          'print(" IMAGE/PNG ")')
            payload = bytes((i * 37 + 11) % 256 for i in range(70000))
            for value in (payload, bytearray(payload), memoryview(payload), memoryview(payload).cast('I')):
                with patch.dict(os.environ, {'PATH': work}):
                    self.assertEqual(mime_policy.detect_native_mime(value), 'image/png')
                self.assertEqual(json.loads(trace.read_text()), {'args': ['--mime-type', '-b', '-'], 'size': 65536,
                                 'hash': hashlib.sha256(payload[:65536]).hexdigest()})
            with self.assertRaises(TypeError):
                mime_policy.detect_native_mime(memoryview(payload)[::2])

    def test_empty_input_and_mime_validation(self):
        with tempfile.TemporaryDirectory() as work:
            for raw, expected in [('application/x-empty\n', 'application/x-empty'), ('text/plain; charset=utf-8', None),
                                  ('text/plain\nimage/png', None), ('\u0085image/png', None), ('\ufeffimage/png\u00a0', 'image/png'),
                                  ('image/png;PRIVATE_MARKER', None), ('', None)]:
                self.detector(work, 'import sys\nsys.stdin.buffer.read()\n' + f'sys.stdout.write({raw!r})')
                with patch.dict(os.environ, {'PATH': work}):
                    self.assertEqual(mime_policy.detect_native_mime(b''), expected, repr(raw))
            self.detector(work, 'import sys\nsys.stdin.buffer.read()\nsys.stderr.write("quiet diagnostic")\nprint("text/plain")')
            with patch.dict(os.environ, {'PATH': work}):
                self.assertEqual(mime_policy.detect_native_mime(b'bytes'), 'text/plain')
            with self.assertRaises(TypeError):
                mime_policy.detect_native_mime('not bytes')

    def test_magic_environment_matches_source_snap_precedence(self):
        with tempfile.TemporaryDirectory() as work:
            trace = Path(work) / 'magic'
            self.detector(work, 'import os,sys\nsys.stdin.buffer.read()\n' +
                          f'open({str(trace)!r},"w").write(os.environ.get("MAGIC",""))\nprint("text/plain")')
            first = Path(work) / 'usr/lib/file/magic.mgc'
            first.parent.mkdir(parents=True)
            first.write_bytes(b'')
            with patch.dict(os.environ, {'PATH': work, 'SNAP': work, 'MAGIC': ''}):
                self.assertEqual(mime_policy.detect_native_mime(b'bytes'), 'text/plain')
            self.assertEqual(trace.read_text(), str(first))
            with patch.dict(os.environ, {'PATH': work, 'SNAP': work, 'MAGIC': 'retained-value'}):
                self.assertEqual(mime_policy.detect_native_mime(b'bytes'), 'text/plain')
            self.assertEqual(trace.read_text(), 'retained-value')

    def test_failures_are_bounded_quiet_and_reaped(self):
        with tempfile.TemporaryDirectory() as work:
            pid_file = Path(work) / 'pid'
            cases = ['raise SystemExit(7)', 'import signal;os.kill(os.getpid(),signal.SIGTERM)', 'print("x"*100000)',
                     'import sys;sys.stderr.write("PRIVATE_MARKER"*10000);sys.stderr.flush()',
                     'import time;time.sleep(30)', 'import os,time;os.close(1);os.close(2);time.sleep(30)']
            for body in cases:
                self.detector(work, 'import os\n' + f'open({str(pid_file)!r},"w").write(str(os.getpid()))\n' + body)
                started = time.monotonic()
                with patch.dict(os.environ, {'PATH': work}):
                    self.assertIsNone(mime_policy.detect_native_mime(b'x'*65536), body)
                self.assertLess(time.monotonic()-started, 3, body)
                with self.assertRaises(ProcessLookupError):
                    os.kill(int(pid_file.read_text()), 0)
            with patch.dict(os.environ, {'PATH': str(Path(work)/'absent')}):
                self.assertIsNone(mime_policy.detect_native_mime(b'private'))
            self.detector(work, 'import sys\nsys.stdin.buffer.read()\nprint("text/plain")')
            with patch.dict(os.environ, {'PATH': work}):
                self.assertEqual(mime_policy.detect_native_mime(b'retry'), 'text/plain')


if __name__ == '__main__':
    unittest.main()
