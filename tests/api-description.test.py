"""Real description PUT values, boundaries and atomic rollback."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
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

with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    tables = ('kb_cards', 'kb_card_dates', 'kb_card_members', 'kb_card_assignees', 'kb_card_people_order', 'kb_card_people_sequence', 'kb_history', 'kb_activity')
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in tables}
    def description():
        return db.execute('SELECT description FROM kb_cards WHERE id=?', (card,)).fetchone()[0] or ''
    before = snapshot()
    assert put({'description': 'denied'}, token=None)[0] == 401
    assert snapshot() == before
    for value in ('Unicode: ää 中文 😀', '  whitespace\nkept  ', '<script>alert(1)</script>', 'null', '', None):
        assert put({'description': value}) == (200, {'_id': card})
        assert description() == (value if value is not None else ''), (repr(value), repr(description()))
    assert call(path, token=owner, data={'description': 'Direct UTF-8 😀'}, escaped=False)[0] == 200
    assert description() == 'Direct UTF-8 😀'
    assert put({'description': 'retained'})[0] == 200
    for invalid in (False, True, 0, 1.5, [], {}, ['text']):
        before = snapshot()
        assert put({'description': invalid, 'members': [], 'dueAt': 0})[0] == 400
        assert snapshot() == before, repr(invalid)
    assert put({'startAt': 0})[0] == 200
    assert description() == 'retained'
    assert put({'assignees': ['rest-member', 'rest-other']})[0] == 200
    for role in ('readonly', 'commentonly', 'normalAssignedOnly', 'readAssignedOnly', 'worker'):
        assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': role})[0] == 200
        before = snapshot()
        assert put({'description': 'denied'}, token=member)[0] == 403
        assert snapshot() == before
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': 'normal'})[0] == 200
    before = snapshot()
    assert call(path.replace('/lists/'+list_id+'/', '/lists/2147483647/'), token=owner, data={'description': 'wrong list'})[0] == 404
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = snapshot()
    assert put({'description': 'archived'}) == (200, {'_id': card})
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    db.execute("CREATE TRIGGER fail_description BEFORE UPDATE OF description ON kb_cards BEGIN SELECT RAISE(ABORT, 'private description failure'); END")
    db.commit()
    before = snapshot()
    status, response = put({'description': 'rollback', 'dueAt': 123, 'members': ['rest-other', 'rest-member']})
    assert status == 500 and 'private description failure' not in json.dumps(response)
    assert snapshot() == before
    db.execute('DROP TRIGGER fail_description'); db.commit()
    assert put({'description': 'retry', 'dueAt': 123, 'members': ['rest-other', 'rest-member']})[0] == 200
    assert description() == 'retry'
print('Description PUT: Unicode/whitespace/HTML, empty/null, invalid-type atomic denial, omitted preservation, role/list/archive boundaries and rollback/retry passed')
