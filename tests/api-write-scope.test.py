"""Combined administrator/assigned-only flags must not bypass REST card scope."""
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
    tables = ('kb_card_archive', 'kb_cards', 'kb_card_dates', 'kb_item_changes', 'kb_card_members', 'kb_card_assignees', 'kb_card_people_order', 'kb_card_people_sequence', 'kb_history', 'kb_activity')
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in tables}
    operations = [(path+'/archive', 'POST', None), (path+'/unarchive', 'POST', None),
                  (path, 'PUT', {'description': 'Forbidden combined flag'}),
                  (path, 'PUT', {'members': [], 'assignees': [], 'dueAt': 0}),
                  *[(path+'/'+field+'/rest-other', method, None) for field in ('members', 'assignees') for method in ('POST', 'DELETE')]]
    for flag in ('isNormalAssignedOnly', 'isCommentAssignedOnly', 'isReadAssignedOnly'):
        status, result = call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'isAdmin': True, flag: True})
        assert status == 200
        assert db.execute('SELECT role FROM kb_members WHERE board_id=? AND username=?', (board, 'rest-member')).fetchone() == ('board-admin',)
        assert db.execute('SELECT 1 FROM kb_member_flags WHERE board_id=? AND username=? AND flag=?', (board, 'rest-member', flag)).fetchone()
        for route, method, body in operations:
            before = snapshot()
            status, result = call(route, method, member, body)
            assert (status, result) == (403, {'error': 'Forbidden'}), (flag, method, route, status, result)
            assert snapshot() == before, (flag, method, route)
        # Site administration is the explicit source override, independent of
        # the target's raw flags and unrelated native board permissions.
        assert call(path, 'PUT', admin, {'description': 'Scoped site administrator'})[0] == 200
    # Non-scope flags follow canonical write capability; do not reuse the
    # stricter legacy whole-board READ exclusion list for these writes.
    for allowed in ({'role': 'admin'}, {'isAdmin': True, 'isWorker': True}, {'isAdmin': True, 'isNoComments': True}):
        assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, allowed)[0] == 200
        assert call(path, 'PUT', member, {'description': 'Unrestricted board administrator'})[0] == 200

    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': 'admin'})[0] == 200
    # Inject a scope change at the first board write, after initial validation.
    # The later guarded check must see it and roll back the injected flag too.
    for flag in ('isNormalAssignedOnly', 'isCommentAssignedOnly', 'isReadAssignedOnly'):
        db.execute("CREATE TRIGGER inject_write_scope BEFORE UPDATE ON kb_boards WHEN NEW.id="+board+" BEGIN INSERT INTO kb_member_flags(board_id,username,flag) VALUES("+board+",'rest-member','"+flag+"'); END")
        db.commit()
        for route, method, body in ((path, 'PUT', {'description': 'Late scope bypass'}), (path+'/archive', 'POST', None), (path+'/unarchive', 'POST', None)):
            before = snapshot()
            before_flags = db.execute('SELECT * FROM kb_member_flags ORDER BY board_id,username,flag').fetchall()
            assert call(route, method, member, body) == (403, {'error': 'Forbidden'})
            assert snapshot() == before
            assert db.execute('SELECT * FROM kb_member_flags ORDER BY board_id,username,flag').fetchall() == before_flags
        db.execute('DROP TRIGGER inject_write_scope'); db.commit()
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': 'normal'})[0] == 200
print('REST write scope: each raw assigned-only flag denies combined board-admin card PUT/merge/pull without writes; late flag injection rolls back; unrestricted board/site admin controls pass')
