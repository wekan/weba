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
    if sys.argv[1] == 'reset-card-people':
        card_id = int(sys.argv[3])
        db.execute('UPDATE kb_cards SET assignee=? WHERE board_id=? AND id=?', ('rest-other', board_id, card_id))
        for table in ('kb_card_members', 'kb_card_assignees', 'kb_card_people_order', 'kb_card_people_sequence'):
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone():
                db.execute('DELETE FROM '+table+' WHERE board_id=? AND card_id=?', (board_id, card_id))
    elif sys.argv[1] == 'reset-board':
        for table in ('kb_members', 'kb_member_flags', 'kb_removed_members'):
            db.execute('DELETE FROM '+table+' WHERE board_id=?', (board_id,))
    elif sys.argv[1] == 'reset':
        for table in ('kb_members', 'kb_member_flags', 'kb_removed_members'):
            db.execute('DELETE FROM '+table+' WHERE board_id=? AND username=?', (board_id, sys.argv[3]))
    elif sys.argv[1] == 'add':
        username, is_admin = sys.argv[3], sys.argv[4] == 'true'
        assert db.execute('SELECT COUNT(*) FROM users WHERE username=?', (username,)).fetchone()[0] == 1
        db.execute('DELETE FROM kb_members WHERE board_id=? AND username=?', (board_id, username))
        db.execute('INSERT INTO kb_members(board_id,username,role) VALUES(?,?,?)', (board_id, username, 'board-admin' if is_admin else 'normal'))
        db.execute('DELETE FROM kb_member_flags WHERE board_id=? AND username=?', (board_id, username))
        db.execute('DELETE FROM kb_removed_members WHERE board_id=? AND username=?', (board_id, username))
    elif sys.argv[1] == 'get':
        row = db.execute('SELECT title,owner FROM kb_boards WHERE id=?', (board_id,)).fetchone()
        if row is None:
            print('null')
        else:
            title, owner = row
            members = [(name, role, True) for name, role in db.execute('SELECT m.username,m.role FROM kb_members m JOIN users u ON m.username=u.username WHERE board_id=? AND NOT EXISTS (SELECT 1 FROM kb_removed_members d WHERE d.board_id=m.board_id AND d.username=m.username)', (board_id,)).fetchall()]
            if owner and db.execute('SELECT COUNT(*) FROM users WHERE username=?', (owner,)).fetchone()[0] and not db.execute('SELECT COUNT(*) FROM kb_removed_members WHERE board_id=? AND username=?', (board_id, owner)).fetchone()[0]:
                members = [(owner, 'board-admin', True)] + [(name, role, active) for name, role, active in members if name != owner]
            members += [(name, role, False) for name, role in db.execute('SELECT d.username,d.role FROM kb_removed_members d JOIN users u ON d.username=u.username WHERE d.board_id=?', (board_id,))]
            values = []
            for username, role, active in members:
                flags = {flag: False for flag in role_flags.values() if flag}
                if role_flags.get(role):
                    flags[role_flags[role]] = True
                for (flag,) in db.execute('SELECT flag FROM kb_member_flags WHERE board_id=? AND username=?', (board_id, username)):
                    if flag in flags:
                        flags[flag] = True
                values.append({'userId': username, 'isActive': active, **flags})
            print(json.dumps({'_id': str(board_id), 'title': title, 'members': values}))
    elif sys.argv[1] in ('cards', 'card'):
        if sys.argv[1] == 'cards':
            records = db.execute('SELECT c.id,c.board_id,c.archived,l.list_id FROM kb_cards c JOIN kb_card_lists l ON l.card_id=c.id AND l.board_id=c.board_id WHERE c.board_id=? AND l.list_id=? AND c.archived=0', (board_id, int(sys.argv[3]))).fetchall()
        else:
            records = db.execute('SELECT c.id,c.board_id,c.archived,l.list_id FROM kb_cards c JOIN kb_card_lists l ON l.card_id=c.id AND l.board_id=c.board_id WHERE c.id=?', (board_id,)).fetchall()
        values = []
        for card_id, parent_id, archived, list_id in records:
            members = [row[0] for row in db.execute("SELECT m.username FROM kb_card_members m LEFT JOIN kb_card_people_order o ON o.board_id=m.board_id AND o.card_id=m.card_id AND o.username=m.username AND o.field='members' WHERE m.board_id=? AND m.card_id=? ORDER BY o.sort_order,m.username", (parent_id, card_id))] if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='kb_card_members'").fetchone() else []
            primary = db.execute('SELECT assignee FROM kb_cards WHERE id=?', (card_id,)).fetchone()[0]
            assignees = [primary] if primary else []
            for (name,) in db.execute("SELECT m.username FROM kb_card_assignees m LEFT JOIN kb_card_people_order o ON o.board_id=m.board_id AND o.card_id=m.card_id AND o.username=m.username AND o.field='assignees' WHERE m.board_id=? AND m.card_id=? ORDER BY o.sort_order,m.username", (parent_id, card_id)):
                if name not in assignees:
                    assignees.append(name)
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='kb_card_people_sequence'").fetchone():
                for field in ('members', 'assignees'):
                    sequence = [row[0] for row in db.execute('SELECT username FROM kb_card_people_sequence WHERE board_id=? AND card_id=? AND field=? ORDER BY sort_order', (parent_id, card_id, field))]
                    if sequence:
                        if field == 'members':
                            members = sequence
                        else:
                            assignees = sequence
            values.append({'_id': str(card_id), 'boardId': str(parent_id), 'listId': str(list_id), 'archived': bool(archived), 'members': members, 'assignees': assignees})
        print(json.dumps(values if sys.argv[1] == 'cards' else values[0] if values else None))
    else:
        raise AssertionError('Unknown fixture operation')
