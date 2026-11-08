"""List document times and newest card changes through real HTTP/native paths."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
path = '/api/boards/'+board+'/lists/'+list_id+'/cards/'+card

def call(route, method='PUT', token=None, data=None, escaped=True):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=json.dumps(data, ensure_ascii=escaped).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())

def login(username):
    status, data = call('/users/login', 'POST', data={'username': username, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200, status
    return data['token']

admin, owner, member = (login(name) for name in ('rest-owner', 'rest-other', 'rest-member'))
def put(data, token=owner):
    return call(path, token=token, data=data)

def lists():
    status, rows = call('/api/boards/'+board+'/lists', 'GET', owner)
    assert status == 200
    return {row['_id']: row for row in rows}
def native(action):
    subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_TEST_MODE': 'list-clock-native', 'WEBA_TEST_CLOCK_ACTION': action, 'WEBA_API_REQUEST': '0'}, check=True)
def iso(epoch):
    seconds, millis = divmod(epoch, 1000)
    return datetime.fromtimestamp(seconds, timezone.utc).replace(microsecond=millis*1000).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    def clock(kind, identity):
        return db.execute('SELECT modified_ms FROM kb_item_changes WHERE board_id=? AND kind=? AND item_id=?', (board, kind, identity)).fetchone()[0]
    def set_clock(kind, identity, value):
        db.execute('UPDATE kb_item_changes SET modified_ms=? WHERE board_id=? AND kind=? AND item_id=?', (value, board, kind, identity)); db.commit()
    before_list = lists()[list_id]['modifiedAt']
    assert isinstance(before_list, str)
    for payload in ({'description': 'Timed change 😀'}, {'members': ['rest-other']}, {'assignees': ['rest-other', 'rest-member']}, {'dueAt': 123}):
        set_clock('card', card, 1234)
        start = time.time_ns() // 1000000
        assert put(payload)[0] == 200
        end = time.time_ns() // 1000000
        stored = clock('card', card)
        assert start-2 <= stored <= end+2
        row = lists()[list_id]
        assert row['modifiedAt'] == before_list
        assert row['cardsModifiedAt'] == iso(stored)
    set_clock('card', card, 2000)
    native('archive')
    row = lists()[list_id]
    assert row['cardsModifiedAt'] == iso(clock('card', card)) and row['cardsModifiedAt'] != iso(2000)
    assert row['modifiedAt'] == before_list
    native('restore')
    set_clock('card', card, 2000)
    set_clock('list', list_id, 1000)
    native('rename')
    row = lists()[list_id]
    assert row['title'] == 'Timed list' and row['modifiedAt'] == iso(clock('list', list_id)) and row['modifiedAt'] != iso(1000)
    assert row['cardsModifiedAt'] == iso(2000)
    before_watch = row
    native('watch')
    assert lists()[list_id] == before_watch
    before = db.execute('SELECT * FROM kb_item_changes ORDER BY board_id,kind,item_id').fetchall()
    assert put({'description': [], 'dueAt': 0})[0] == 400
    assert db.execute('SELECT * FROM kb_item_changes ORDER BY board_id,kind,item_id').fetchall() == before
    native('prepare')
    # A failed timestamp write must roll back the card and audit rows too.
    before_card = db.execute('SELECT * FROM kb_cards WHERE id=?', (card,)).fetchone()
    before_history = db.execute('SELECT * FROM kb_history ORDER BY id').fetchall()
    db.execute("CREATE TRIGGER fail_change_clock BEFORE UPDATE ON kb_item_changes BEGIN SELECT RAISE(ABORT, 'private clock failure'); END"); db.commit()
    status, data = put({'description': 'Discarded clock edit', 'dueAt': 456})
    assert status == 500 and 'private clock failure' not in json.dumps(data)
    assert db.execute('SELECT * FROM kb_cards WHERE id=?', (card,)).fetchone() == before_card
    assert db.execute('SELECT * FROM kb_history ORDER BY id').fetchall() == before_history
    assert db.execute('SELECT * FROM kb_item_changes ORDER BY board_id,kind,item_id').fetchall() == before
    all_tables = ('kb_cards', 'kb_item_changes', 'kb_entries', 'kb_files', 'kb_meta', 'kb_history', 'kb_activity', 'kb_retired_authors')
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in all_tables}
    for action in ('comment', 'delete-entry', 'start', 'stop', 'file', 'delete-file', 'archive', 'setting'):
        entry = file_id = 0
        if action in ('delete-entry', 'stop'):
            entry = db.execute('INSERT INTO kb_entries(board_id,card_id,kind,title,body,parent_id,done,amount,author,created_at,value_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)', (board, card, 'time' if action == 'stop' else 'comment', 'Clock seed', 'Retained body', 0, 0, 0, 'rest-other', datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=' '), 'text')).lastrowid
        if action == 'delete-file':
            file_id = db.execute('INSERT INTO kb_files(board_id,card_id,filename,content,author,created_at) VALUES(?,?,?,?,?,?)', (board, card, 'seed.txt', b'retained', 'rest-other', datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=' '))).lastrowid
        db.commit()
        before_native = snapshot()
        subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
            env={**os.environ, 'WEBA_TEST_MODE': 'list-clock-failure', 'WEBA_TEST_CLOCK_ACTION': action, 'WEBA_API_REQUEST': '0', 'WEBA_TEST_CLOCK_ENTRY_ID': str(entry), 'WEBA_TEST_CLOCK_FILE_ID': str(file_id)}, check=True)
        assert snapshot() == before_native, action
        print("Native clock rollback:", action)
        if entry: db.execute('DELETE FROM kb_entries WHERE id=?', (entry,))
        if file_id: db.execute('DELETE FROM kb_files WHERE id=?', (file_id,))
        db.commit()
    db.execute('DROP TRIGGER fail_change_clock'); db.commit()
    assert put({'description': 'Clock retry'})[0] == 200
    # Leave a real archived, dated card and untimed legacy cards for the original
    # reducer comparison. The archived card is the only dated card in its list.
    other_list = db.execute('SELECT id,lane,title FROM kb_lists WHERE board_id=? AND id<>? ORDER BY id', (board, list_id)).fetchone()
    archived_id = db.execute('INSERT INTO kb_cards(board_id,title,description,lane,status,assignee,labels,due_day,archived) VALUES(?,?,?,?,?,?,?,?,?)', (board, 'Archived clock oracle', '', other_list[1], other_list[2], '', '', '', 1)).lastrowid
    db.execute('INSERT INTO kb_card_lists(board_id,card_id,list_id) VALUES(?,?,?)', (board, archived_id, other_list[0]))
    db.execute('INSERT INTO kb_item_changes(board_id,kind,item_id,modified_ms) VALUES(?,?,?,?)', (board, 'card', archived_id, 1767225600456)); db.commit()
    assert lists()[str(other_list[0])]['cardsModifiedAt'] == iso(1767225600456)

print('List times HTTP: real UTC changes, independent list/card edits, archived cards, personal watch isolation, invalid payloads and timestamp-failure rollback/retry passed')
