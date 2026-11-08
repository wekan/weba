"""Security regression boundaries, independent of production accounts/data."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent.parent


class RequestLoggingTest(unittest.TestCase):
    def test_native_request_payloads_are_not_logged_by_application_sources(self):
        # Gambas commands carry passwords and sensitive board content. The old
        # initializer logged Request.Query/Application.Request to a shared file.
        # This source guard covers every application module, not just the host's
        # intentionally quiet access logger, and runs without a production log.
        for source in (ROOT / 'WeKan/.src').iterdir():
            if source.suffix not in {'.class', '.module'}:
                continue
            text = source.read_text()
            with self.subTest(source=source.name):
                self.assertNotRegex(text, r'(?i)\b(?:Request\.Query|Application\.Request)\b')
                self.assertNotRegex(text, r'(?i)\bModLogs\.AddLogs\s*\(')
        self.assertFalse((ROOT / 'WeKan/.src/ModLogs.module').exists())
        self.assertNotIn('/tmp/kanban.log', (ROOT / 'WeKan/.src/ModVar.module').read_text())


if __name__ == '__main__':
    unittest.main()
