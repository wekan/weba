"""Archive REST lifecycle, source status contracts, graph atomicity and metadata."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone

base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
path = '/api/boards/'+board+'/lists/'+list_id+'/cards/'+card

def call(route, method='POST', token=None, data=None):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        assert response.headers.get_content_type() == 'application/json'
        return response.status, json.loads(response.read())

def login(username):
    status, data = call('/users/login', data={'username': username, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200, status
    return data['token']

admin, owner, member = (login(name) for name in ('rest-owner', 'rest-other', 'rest-member'))
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
    def snapshot():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in tables}
    def state():
        return bool(db.execute('SELECT archived FROM kb_cards WHERE id=?', (card,)).fetchone()[0])
    def post(operation, token=owner, route=path):
        return call(route+'/'+operation, token=token)
    def no_write(operation, expected, token=owner, route=path):
        before = snapshot()
        result = post(operation, token, route)
        assert result == expected, (operation, route, result)
        assert snapshot() == before, (operation, route, 'unexpected mutation')
    # Fixtures from earlier suites may leave archive history; root starts active.
    assert not state()
    for operation in ('archive', 'unarchive'):
        no_write(operation, (401, {'error': 'Invalid credentials'}), token=None)
        before = snapshot()
        assert call(path+'/'+operation, 'GET', owner)[0] == 405
        assert snapshot() == before
        no_write(operation, (404, {'error': 'Board not found'}), route=path.replace('/boards/'+board+'/', '/boards/2147483647/'))
        for bad in (path.replace('/cards/'+card, '/cards/missing'),
                    path.replace('/cards/'+card, '/cards/2147483647'),
                    path.replace('/lists/'+list_id+'/', '/lists/2147483647/'),
                    path.replace('/lists/'+list_id+'/', '/lists/'+str(db.execute('SELECT id FROM kb_lists WHERE board_id<>? ORDER BY id LIMIT 1', (board,)).fetchone()[0])+'/')):
            no_write(operation, (404, {'error': 'Card not found'}), route=bad)
    no_write('unarchive', (404, {'error': 'Card not found'}))
    # Denied roles must be rejected before even malformed list/card identifiers.
    for role in ('readonly', 'commentonly', 'worker', 'normalAssignedOnly', 'commentAssignedOnly', 'readAssignedOnly'):
        assert call('/api/boards/'+board+'/members/rest-member', token=admin, data={'role': role})[0] == 200
        for operation in ('archive', 'unarchive'):
            no_write(operation, (403, {'error': 'Forbidden'}), token=member)
            no_write(operation, (403, {'error': 'Forbidden'}), token=member, route=path.replace('/cards/'+card, '/cards/missing'))
    # Allowed roles, including the site-admin override without board membership.
    for token, role in ((owner, None), (member, 'normal'), (member, 'admin'), (member, 'nocomments'), (admin, None)):
        if role:
            assert call('/api/boards/'+board+'/members/rest-member', token=admin, data={'role': role})[0] == 200
        start = datetime.now(timezone.utc)
        status, result = post('archive', token)
        end = datetime.now(timezone.utc)
        assert status == 200 and result['_id'] == card and result['archived'] is True, (role, status, result)
        stamp = result['archivedAt']
        assert start <= datetime.fromisoformat(stamp.replace('Z', '+00:00')) <= end
        assert state()
        status, stored = call('/api/cards/'+card, 'GET', owner)
        assert status == 200 and stored['archived'] is True and stored['archivedAt'] == stamp
        assert call(path, 'GET', owner) == (404, {'error': 'Card not found'})
        no_write('archive', (404, {'error': 'Card not found'}), token)
        assert post('unarchive', token) == (200, {'_id': card, 'archived': False})
        assert not state()
        status, stored = call(path, 'GET', owner)
        assert status == 200 and stored['archived'] is False and stored['archivedAt'] == stamp
        no_write('unarchive', (404, {'error': 'Card not found'}), token)
    assert call('/api/boards/'+board+'/members/rest-member', token=admin, data={'role': 'normal'})[0] == 200
    # Fail timestamp insertion/update and final change-clock write separately.
    # Both paths must undo flags, timestamps, history and all relationship rows.
    for table, event in (('kb_card_archive', 'UPDATE'), ('kb_card_archive', 'INSERT'), ('kb_item_changes', 'UPDATE')):
        if event == 'INSERT':
            db.execute('DELETE FROM kb_card_archive WHERE card_id=?', (card,)); db.commit()
        db.execute("CREATE TRIGGER fail_archive BEFORE "+event+" ON "+table+" BEGIN SELECT RAISE(ABORT, 'private archive database error'); END")
        db.commit()
        no_write('archive', (500, {'error': 'Card archive failed'}))
        db.execute('DROP TRIGGER fail_archive'); db.commit()
        assert post('archive')[0] == 200 and state()
        assert post('unarchive') == (200, {'_id': card, 'archived': False})
    # Native creation of a diamond graph, then a real REST write failing after
    # the root was changed. No descendant/clock/history may be partly committed.
    graph = json.loads(subprocess.check_output([os.environ['GBX'], '-s', 'ArchiveFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_API_REQUEST': '0', 'WEBA_TEST_USER': 'rest-other', 'WEBA_TEST_MODE': 'archive-graph'}, text=True))['ids']
    db.execute("CREATE TRIGGER fail_descendant BEFORE INSERT ON kb_card_archive WHEN NEW.card_id="+str(graph[1])+" BEGIN SELECT RAISE(ABORT, 'private descendant archive failure'); END")
    db.commit()
    no_write('archive', (500, {'error': 'Card archive failed'}))
    db.execute('DROP TRIGGER fail_descendant'); db.commit()
    status, result = post('archive')
    assert status == 200
    stamps = []
    for item in graph:
        assert db.execute('SELECT archived FROM kb_cards WHERE id=?', (item,)).fetchone() == (1,)
        stamps.append(db.execute('SELECT archived_ms FROM kb_card_archive WHERE card_id=?', (item,)).fetchone()[0])
    assert len(set(stamps)) == 1
    assert post('unarchive')[0] == 200
    for item, stamp in zip(graph, stamps):
        assert db.execute('SELECT archived FROM kb_cards WHERE id=?', (item,)).fetchone() == (0,)
        assert db.execute('SELECT archived_ms FROM kb_card_archive WHERE card_id=?', (item,)).fetchone() == (stamp,)
    # A failed restore must also keep the complete archived state and its time.
    assert post('archive')[0] == 200
    db.execute("CREATE TRIGGER fail_restore BEFORE UPDATE OF archived ON kb_cards BEGIN SELECT RAISE(ABORT, 'private restore failure'); END")
    db.commit()
    no_write('unarchive', (500, {'error': 'Card archive failed'}))
    db.execute('DROP TRIGGER fail_restore'); db.commit()
    assert post('unarchive')[0] == 200
print('Archive REST: JSON scope/state errors, authorization order, allowed/denied roles, persisted archive/retained restore time, repeat no-write and SQL failure/atomic retry passed')
