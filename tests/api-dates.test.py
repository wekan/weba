"""Real four-field date PUT contracts, projection, denial and atomic rollback."""
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

def call(route, method='PUT', token=None, data=None):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=json.dumps(data).encode() if data is not None else None)
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
    def dates():
        return dict(db.execute('SELECT field,epoch_ms FROM kb_card_dates WHERE board_id=? AND card_id=?', (board, card)))
    before = snapshot()
    assert put({'dueAt': 0}, token=None)[0] == 401
    assert snapshot() == before
    payload = {'receivedAt': 0, 'startAt': '2026-06-20', 'dueAt': '2026-06-20T00:30:40.123+03:30', 'endAt': '1767225600123'}
    assert put(payload) == (200, {'_id': card})
    expected = {'receivedAt': 0, 'startAt': int(datetime(2026, 6, 20, tzinfo=timezone.utc).timestamp())*1000,
                'dueAt': int(datetime(2026, 6, 19, 21, 0, 40, tzinfo=timezone.utc).timestamp())*1000+123, 'endAt': 1767225600123}
    assert dates() == expected
    assert db.execute('SELECT due_day FROM kb_cards WHERE id=?', (card,)).fetchone() == ('2026-06-19',)
    for boundary, iso in ((8640000000000000, '+275760-09-13T00:00:00.000Z'), (-8640000000000000, '-271821-04-20T00:00:00.000Z')):
        for encoding in (boundary, float(boundary), str(boundary)):
            assert put({'dueAt': encoding})[0] == 200
            assert dates()['dueAt'] == boundary
        record = json.loads(subprocess.check_output([sys.executable, str(Path(__file__).with_name('wekan-members-oracle.py')), 'card', card], text=True))
        assert record['dueAt'] == iso
    assert put({'dueAt': payload['dueAt']})[0] == 200
    for field in payload:
        for clear in ('', None, 'null'):
            assert put({field: payload[field]})[0] == 200
            assert put({field: clear})[0] == 200
            expected.pop(field, None)
            assert dates() == expected
            assert put({field: payload[field]})[0] == 200
            expected = {'receivedAt': 0, 'startAt': int(datetime(2026, 6, 20, tzinfo=timezone.utc).timestamp())*1000,
                        'dueAt': int(datetime(2026, 6, 19, 21, 0, 40, tzinfo=timezone.utc).timestamp())*1000+123, 'endAt': 1767225600123}
    for invalid in ('not-a-date', '   ', '2026-13-99', True, {}, [], 8640000000000001):
        before = snapshot()
        assert put({'dueAt': invalid}) == (404, {'message': 'Error'})
        assert snapshot() == before, repr(invalid)
    assert put({'dueAt': 'not-a-date', 'members': ['rest-other']})[0] == 200
    assert dates() == expected
    assert put({'assignees': ['rest-other', 'rest-member']})[0] == 200
    for role in ('readonly', 'commentonly', 'normalAssignedOnly', 'readAssignedOnly', 'worker'):
        assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': role})[0] == 200
        before = snapshot()
        assert put({'dueAt': None}, token=member)[0] == 403
        assert snapshot() == before
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': 'normal'})[0] == 200
    before = snapshot()
    assert call(path.replace('/lists/'+list_id+'/', '/lists/2147483647/'), token=owner, data={'dueAt': 0})[0] == 404
    assert call(path.replace('/boards/'+board+'/', '/boards/'+str(fixture['boardId'])+'/'), token=admin, data={'dueAt': 0})[0] == 404
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = snapshot()
    assert put({'dueAt': None, 'endAt': 0}) == (200, {'_id': card})
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    before = snapshot()
    db.execute("CREATE TRIGGER reject_date_write BEFORE INSERT ON kb_card_dates WHEN NEW.field='endAt' BEGIN SELECT RAISE(ABORT, 'private date driver detail'); END")
    db.commit()
    assert put({'members': ['rest-member'], 'dueAt': 0, 'endAt': 0}, token=admin) == (500, {'error': 'Card membership update failed'})
    assert snapshot() == before, 'Date failure left partial people/date/day/history writes'
    db.execute('DROP TRIGGER reject_date_write'); db.commit()
    assert put({'members': ['rest-member'], 'dueAt': 0, 'endAt': 0}, token=admin)[0] == 200
    assert dates()['dueAt'] == dates()['endAt'] == 0
    assert db.execute('SELECT due_day FROM kb_cards WHERE id=?', (card,)).fetchone() == ('1970-01-01',)
    assert call('/api/boards/'+board, 'GET', admin)[0] == 404
print('Dates PUT: four UTC fields, milliseconds/offset/epoch zero, all clear forms, invalid skips, role/list/archive boundaries and combined sanitized rollback passed')
