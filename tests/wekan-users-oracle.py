"""Independent SQLite user lookup and native disposable user fixture creation."""
import json
import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import sys

operation = sys.argv[1]
if operation == 'seed':
    username = 'original-delete-' + secrets.token_hex(8)
    result = subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_TEST_MODE': 'seed-user', 'WEBA_TEST_USER': username},
        check=True, capture_output=True, text=True)
    print(result.stdout.strip())
else:
    with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
        username = sys.argv[2]
        if operation == 'get':
            row = db.execute('SELECT username,admin FROM users WHERE username=?', (username,)).fetchone()
            print(json.dumps({'_id': row[0], 'isAdmin': bool(row[1])} if row else None))
        elif operation == 'cleanup':
            # The original callback finally block deletes only its own fixture.
            assert username.startswith('original-delete-')
            db.execute('DELETE FROM users WHERE username=?', (username,))
        else:
            raise AssertionError('Unknown user fixture operation')
