"""Real merge routes: separate members/assignees, permissions and rollback."""
import json
import os
from pathlib import Path
import sqlite3
import urllib.error
import urllib.request

base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
route = '/api/boards/'+board+'/lists/'+list_id+'/cards/'+card+'/'
def call(path, method='POST', token=None, data=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer '+token
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(base+path, method=method, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())
def login(username):
    status, data = call('/users/login', data={'username': username, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200, status
    return data['token']
admin, owner, member = (login(name) for name in ('rest-owner', 'rest-other', 'rest-member'))
def role(value):
    assert call('/api/boards/'+board+'/members/rest-member', token=admin, data={'role': value})[0] == 200
def change(field, username, method='POST', token=owner):
    return call(route+field+'/'+username, method, token)
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    tables = ('kb_card_members', 'kb_card_people_order', 'kb_card_assignees', 'kb_cards', 'kb_card_lists', 'kb_history', 'kb_activity')
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in tables}
    before = snapshot()
    assert change('members', 'rest-member', token=None)[0] == 401
    assert change('members', 'rest-member', token='forged')[0] == 401
    assert snapshot() == before
    status, result = change('members', 'rest-member')
    assert status == 200 and result == {'_id': card, 'members': ['rest-member'], 'assignees': ['rest-other']}
    assert change('members', 'rest-member')[1]['members'] == ['rest-member']
    assert db.execute('SELECT COUNT(*) FROM kb_card_members WHERE card_id=?', (card,)).fetchone()[0] == 1
    assert change('members', 'rest-other')[0] == 200
    assert change('members', 'rest-member', 'DELETE')[0] == 200
    assert change('members', 'rest-member')[1]['members'] == ['rest-other', 'rest-member'], 'merge must append rather than sort names'
    assert change('members', 'rest-other', 'DELETE')[0] == 200
    assert change('assignees', 'rest-member')[0] == 200
    status, result = change('assignees', 'rest-other', 'DELETE')
    assert status == 200 and result['members'] == ['rest-member'] and result['assignees'] == ['rest-member']
    assert db.execute('SELECT assignee FROM kb_cards WHERE id=?', (card,)).fetchone() == ('rest-member',)
    for value in ('readonly', 'commentonly', 'commentAssignedOnly', 'readAssignedOnly', 'normalAssignedOnly', 'worker'):
        role(value)
        before = snapshot()
        assert change('members', 'rest-other', token=member)[0] == 403, value
        assert change('assignees', 'rest-member', 'DELETE', token=member)[0] == 403, value
        assert snapshot() == before, value
    for value in ('normal', 'nocomments'):
        role(value)
        assert change('members', 'rest-member', token=member)[0] == 200, value
    # Inactive targets cannot be assigned, but removing stale entries is allowed.
    assert call('/api/boards/'+board+'/members/rest-member/remove', token=admin, data={'action': 'remove'})[0] == 200
    for field in ('members', 'assignees'):
        before = snapshot()
        assert change(field, 'rest-member')[0] == 400
        assert change(field, 'not-a-member')[0] == 400
        assert change(field, 'rest-owner')[0] == 400, 'site admin is not an active board member'
        assert snapshot() == before
        status, result = change(field, 'rest-member', 'DELETE')
        assert status == 200 and result[field] == []
        assert change(field, 'not-a-member', 'DELETE')[0] == 200
    assert db.execute('SELECT assignee FROM kb_cards WHERE id=?', (card,)).fetchone() in ((None,), ('',))
    assert not db.execute('SELECT 1 FROM kb_card_assignees WHERE card_id=?', (card,)).fetchone()
    assert call('/api/boards/'+board+'/members/rest-member/add', token=admin, data={'action': 'add', 'role': 'normal'})[0] == 200
    assert change('members', 'rest-member', token=admin)[0] == 200, 'explicit site-admin mutation is allowed'
    assert call('/api/boards/'+board, 'GET', admin)[0] == 404, 'scoped mutation must not grant general board reads'
    other_list = str(db.execute('SELECT id FROM kb_lists WHERE board_id=? AND id<>? LIMIT 1', (board, list_id)).fetchone()[0])
    before = snapshot()
    assert call(route.replace('/lists/'+list_id+'/', '/lists/'+other_list+'/')+'members/rest-member', token=owner)[0] == 404
    assert call(route.replace('/boards/'+board+'/', '/boards/'+str(fixture['boardId'])+'/')+'members/rest-member', token=admin)[0] == 404
    assert call(route.replace('/cards/'+card+'/', '/cards/1.0/')+'members/rest-member', token=owner)[0] == 404
    assert call(route+'members/rest-member', 'PUT', owner)[0] == 405
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = snapshot()
    assert change('members', 'rest-member')[0] == 404
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    # Reject after history has been written: every nested write must roll back.
    before = snapshot()
    db.execute("CREATE TRIGGER reject_card_member BEFORE INSERT ON kb_card_members BEGIN SELECT RAISE(ABORT, 'private card member driver detail'); END")
    db.commit()
    assert change('members', 'rest-other', token=admin) == (500, {'error': 'Card membership update failed'})
    assert snapshot() == before
    db.execute('DROP TRIGGER reject_card_member'); db.commit()
    assert change('members', 'rest-other', token=admin)[0] == 200
print('Card people REST: independent merge fields, deduplication, role/scoped-admin denial, inactive/stale targets, board/list/archive boundaries and atomic sanitized failure passed')
