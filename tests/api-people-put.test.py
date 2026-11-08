"""Card people PUT: real normalization, filtering, replacement and rollback."""
import json
import os
from pathlib import Path
import sqlite3
import urllib.error
import urllib.request

base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
path = '/api/boards/'+board+'/lists/'+list_id+'/cards/'+card
def call(route, method='PUT', token=None, data=None, raw=None):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=raw if raw is not None else json.dumps(data).encode() if data is not None else None)
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
def role(value):
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': value})[0] == 200
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    tables = ('kb_card_archive', 'kb_item_changes', 'kb_cards', 'kb_card_members', 'kb_card_assignees', 'kb_card_people_order',
              'kb_card_people_sequence', 'kb_card_lists', 'kb_history', 'kb_activity')
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in tables}
    def sequence(field):
        return [row[0] for row in db.execute('SELECT username FROM kb_card_people_sequence WHERE board_id=? AND card_id=? AND field=? ORDER BY sort_order', (board, card, field))]
    before = snapshot()
    assert put({'members': []}, token=None)[0] == 401
    assert put({'members': []}, token='forged')[0] == 401
    assert snapshot() == before
    # Same coercions as server/lib/restArrayParam.js, followed by active filtering.
    cases = [('', []), (None, []), ([], []), (False, []), (42, []), ({}, []),
             ('rest-other', ['rest-other']),
             ([None, '', 5, False, {}, 'rest-other'], ['rest-other']),
             (['rest-member', 'rest-other', 'rest-member'], ['rest-member', 'rest-other', 'rest-member']),
             (['missing-person', 'rest-other', 'rest-owner'], ['rest-other'])]
    for value, expected in cases:
        assert put({'members': value, 'assignees': value}) == (200, {'_id': card}), repr(value)
        for field in ('members', 'assignees'):
            assert sequence(field) == expected, (field, repr(value))
            relation = 'kb_card_'+field
            actual = {row[0] for row in db.execute('SELECT username FROM '+relation+' WHERE board_id=? AND card_id=?', (board, card))}
            assert actual == set(expected), (field, actual)
    # Omitted fields are untouched, and explicit empty values always clear.
    assert put({'members': ['rest-other', 'rest-other'], 'assignees': ['rest-member']})[0] == 200
    assert put({'assignees': None})[0] == 200
    assert sequence('members') == ['rest-other', 'rest-other'] and sequence('assignees') == []
    assert put({'assignees': ['rest-other'], 'members': ''})[0] == 200
    assert sequence('members') == [] and sequence('assignees') == ['rest-other']
    # Merge preserves existing duplicate values; pull removes every occurrence.
    assert put({'members': ['rest-member', 'rest-other', 'rest-member']})[0] == 200
    merged = call(path+'/members/rest-member', 'POST', owner)
    assert merged[0] == 200 and merged[1]['members'] == ['rest-member', 'rest-other', 'rest-member']
    pulled = call(path+'/members/rest-member', 'DELETE', owner)
    assert pulled[0] == 200 and pulled[1]['members'] == ['rest-other']
    assert call('/api/boards/'+board+'/members/rest-member/remove', 'POST', admin, {'action': 'remove'})[0] == 200
    assert put({'members': ['rest-member', 'rest-other'], 'assignees': ['rest-member']})[0] == 200
    assert sequence('members') == ['rest-other'] and sequence('assignees') == []
    assert call('/api/boards/'+board+'/members/rest-member/add', 'POST', admin, {'action': 'add', 'role': 'normal'})[0] == 200
    for value in ('readonly', 'commentonly', 'commentAssignedOnly', 'readAssignedOnly', 'normalAssignedOnly', 'worker'):
        role(value)
        before = snapshot()
        assert put({'members': [], 'assignees': []}, token=member)[0] == 403, value
        assert snapshot() == before, value
    role('normal')
    assert put({'members': ['rest-member']}, token=member)[0] == 200
    assert put({'members': ['rest-other']}, token=admin)[0] == 200
    assert call('/api/boards/'+board, 'GET', admin)[0] == 200, 'Global administrator REST reads follow WeKan independently of scoped mutation'
    before = snapshot()
    assert put({}) == (404, {'message': 'Error'})
    assert put({'members': [], 'title': 'Not implemented'})[0] == 400
    for raw in (b'{"members":undefined}', b'{"members":', b'[]'):
        assert call(path, token=owner, raw=raw)[0] == 400
    other_list = str(db.execute('SELECT id FROM kb_lists WHERE board_id=? AND id<>? LIMIT 1', (board, list_id)).fetchone()[0])
    assert call(path.replace('/lists/'+list_id+'/', '/lists/'+other_list+'/'), token=owner, data={'members': []})[0] == 404
    assert call(path.replace('/boards/'+board+'/', '/boards/'+str(fixture['boardId'])+'/'), token=admin, data={'members': []})[0] == 404
    assert snapshot() == before
    # The original legacy PUT returns the ID but skips people edits on archives.
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = snapshot()
    assert put({'members': [], 'assignees': []}) == (200, {'_id': card})
    assert snapshot() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    # Fail the second field after the first field and history have been written.
    before = snapshot()
    db.execute("CREATE TRIGGER reject_people_put BEFORE INSERT ON kb_card_assignees BEGIN SELECT RAISE(ABORT, 'private PUT driver detail'); END")
    db.commit()
    assert put({'members': ['rest-member'], 'assignees': ['rest-other']}, token=admin) == (500, {'error': 'Card membership update failed'})
    assert snapshot() == before, 'Failed combined PUT partially wrote members/assignees/history'
    db.execute('DROP TRIGGER reject_people_put'); db.commit()
    assert put({'members': ['rest-member'], 'assignees': ['rest-other']}, token=admin)[0] == 200
print('People PUT: explicit clears, coercion/filtering, duplicate/order retention, omitted fields, merge/pull, role/list/archive boundaries and combined sanitized rollback passed')
