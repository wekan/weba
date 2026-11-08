"""SQLite fixture adapter for original, unchanged WeKan member REST assertions."""
import json
import os
from pathlib import Path
import sqlite3
import sys

schema = json.loads((Path(__file__).resolve().parent.parent / 'WeKan/.public/api-member-roles.json').read_text())
role_flags = {item['role']: item['flag'] for item in schema['roles']}
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    board_id = int(sys.argv[2])
    if sys.argv[1] == 'add':
        username, is_admin = sys.argv[3], sys.argv[4] == 'true'
        assert db.execute('SELECT COUNT(*) FROM users WHERE username=?', (username,)).fetchone()[0] == 1
        db.execute('DELETE FROM kb_members WHERE board_id=? AND username=?', (board_id, username))
        db.execute('INSERT INTO kb_members(board_id,username,role) VALUES(?,?,?)', (board_id, username, 'board-admin' if is_admin else 'normal'))
        db.execute('DELETE FROM kb_member_flags WHERE board_id=? AND username=?', (board_id, username))
    elif sys.argv[1] == 'get':
        row = db.execute('SELECT title,owner FROM kb_boards WHERE id=?', (board_id,)).fetchone()
        if row is None:
            print('null')
        else:
            title, owner = row
            members = db.execute('SELECT m.username,m.role FROM kb_members m JOIN users u ON m.username=u.username WHERE board_id=?', (board_id,)).fetchall()
            if owner and db.execute('SELECT COUNT(*) FROM users WHERE username=?', (owner,)).fetchone()[0]:
                members = [(owner, 'board-admin')] + [(name, role) for name, role in members if name != owner]
            values = []
            for username, role in members:
                flags = {flag: False for flag in role_flags.values() if flag}
                if role_flags.get(role):
                    flags[role_flags[role]] = True
                for (flag,) in db.execute('SELECT flag FROM kb_member_flags WHERE board_id=? AND username=?', (board_id, username)):
                    if flag in flags:
                        flags[flag] = True
                values.append({'userId': username, 'isActive': True, **flags})
            print(json.dumps({'_id': str(board_id), 'title': title, 'members': values}))
    else:
        raise AssertionError('Unknown fixture operation')
