"""Real HTTP user deletion: authoritative result, denial, revocation and content."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import urllib.error
import urllib.request

base = os.environ['WEBA_TEST_URL']
def call(path, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer '+token
    request = urllib.request.Request(base+path, method=method, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read()), response.headers

def login(username):
    status, data, _ = call('/users/login', 'POST', {'username': username, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200, status
    return data['token']

def fixture(mode, username, admin=False):
    result = subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_TEST_MODE': mode, 'WEBA_TEST_USER': username, 'WEBA_TEST_ADMIN': '1' if admin else '0'},
        capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

target = 'rest-delete-target'
fixture('seed-user', target)
content = fixture('delete-content', target)
owner = login('rest-owner')
other = login('rest-other')
victim = login(target)
path = '/api/users/'+target
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    tables = ('kb_card_archive', 'kb_item_changes', 'users', 'account_sessions', 'api_tokens', 'kb_boards', 'kb_cards', 'kb_members',
              'kb_removed_members', 'kb_member_flags', 'kb_card_assignees', 'kb_card_members', 'kb_card_people_order', 'kb_card_people_sequence', 'kb_user_meta',
              'kb_entries', 'kb_files', 'kb_history', 'kb_activity', 'kb_retired_authors')
    def rows(table):
        return sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr)
    before = {table: rows(table) for table in tables}
    assert call(path, 'DELETE')[0] == 401
    assert call(path, 'DELETE', token='forged')[0] == 401
    assert call(path, 'DELETE', token=other)[0] == 403, 'board administrator is not site administrator'
    assert call('/api/users/missing-delete-target', 'DELETE', token=other)[0] == 403
    assert call(path, 'DELETE', token=victim)[0] == 403
    assert call(path, 'POST', {}, owner)[0] == 405
    for table in tables:
        assert rows(table) == before[table], 'Denied deletion changed '+table
    # Fail after reference cleanup; do not report success or expose driver data.
    db.execute("CREATE TRIGGER reject_rest_delete BEFORE DELETE ON users WHEN OLD.username = 'rest-delete-target' BEGIN SELECT RAISE(ABORT, 'private deletion driver detail'); END")
    db.commit()
    assert call(path, 'DELETE', token=owner)[:2] == (500, {'error': 'User deletion failed'})
    for table in tables:
        assert rows(table) == before[table], 'Failed REST deletion changed '+table
    db.execute('DROP TRIGGER reject_rest_delete')
    db.commit()
    status, result, headers = call(path, 'DELETE', token=owner)
    assert status == 200 and result == {'_id': target}
    assert headers['Cache-Control'] == 'no-store'
    for table in ('users', 'account_sessions', 'api_tokens', 'kb_members', 'kb_removed_members', 'kb_member_flags', 'kb_card_assignees', 'kb_card_members', 'kb_card_people_order', 'kb_card_people_sequence', 'kb_user_meta'):
        assert db.execute('SELECT COUNT(*) FROM '+table+' WHERE username=?', (target,)).fetchone()[0] == 0, table
    assert db.execute('SELECT owner FROM kb_boards WHERE id=?', (content['boardId'],)).fetchone() == (None,)
    assert db.execute('SELECT title,description,assignee FROM kb_cards WHERE id=?', (content['cardId'],)).fetchone() == ('REST retained card', 'REST retained body', 'rest-other')
    assert db.execute('SELECT username FROM kb_card_members WHERE card_id=?', (content['cardId'],)).fetchall() == [('rest-other',)]
    assert db.execute('SELECT body,author FROM kb_entries WHERE card_id=? AND kind=?', (content['cardId'], 'comment')).fetchall() == [('REST retained comment', None)]
    assert db.execute('SELECT content,author FROM kb_files WHERE card_id=?', (content['cardId'],)).fetchall() == [(b'retained\0bytes', None)]
    assert db.execute('SELECT COUNT(*) FROM kb_entries WHERE card_id=? AND kind=? AND done=0', (content['cardId'], 'time')).fetchone()[0] == 0
    assert db.execute('SELECT display_name FROM kb_retired_authors WHERE card_id=?', (content['cardId'],)).fetchall() == [(target,)] * 3
    assert rows('kb_history') == before['kb_history'] and rows('kb_activity') == before['kb_activity']
    assert not db.execute('SELECT 1 FROM api_tokens WHERE digest=?', (hashlib.sha256(victim.encode()).hexdigest(),)).fetchone()
assert call('/api/boards/'+str(content['boardId']), token=victim)[0] == 401
assert call('/api/boards/'+str(content['boardId']), token=other)[0] == 200
assert call(path, 'DELETE', token=owner)[:2] == (404, {'error': 'User not found'})
assert call('/api/users/missing-delete-target', 'DELETE', token=owner)[:2] == (404, {'error': 'User not found'})
# Original REST semantics permit site-admin self deletion; native UI keeps its guard.
fixture('seed-user', 'rest-delete-admin', admin=True)
self_token = login('rest-delete-admin')
assert call('/api/users/rest-delete-admin', 'DELETE', token=self_token)[:2] == (200, {'_id': 'rest-delete-admin'})
assert call('/api/users/rest-delete-admin', 'DELETE', token=self_token)[0] == 401
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    assert not db.execute('SELECT 1 FROM users WHERE username=?', ('rest-delete-admin',)).fetchone()
    assert not db.execute('SELECT 1 FROM account_sessions WHERE username=?', ('rest-delete-admin',)).fetchone()
print('REST user deletion: authoritative repeat/missing results, site-admin gate, no denied changes, token/session revocation, retained content and self deletion passed')
