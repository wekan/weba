"""Real membership REST contracts from WeKan users/boards routes and spec 17.

Uses independent SQLite oracles; the original Mongo/Blaze fixture suite remains
pending and must not be described as passed by these checks.
"""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import urllib.error
import urllib.request

BASE = os.environ['WEBA_TEST_URL']
PASSWORD = os.environ['WEBA_TEST_PASSWORD']
BOARDS = json.loads(os.environ['WEBA_TEST_BOARDS'])
DATABASE = Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']

def call(path, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer '+token
    request = urllib.request.Request(BASE+path, method=method, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        text = response.read()
        return response.status, json.loads(text) if text else None

def login(username):
    status, data = call('/users/login', 'POST', {'username': username, 'password': PASSWORD})
    assert status == 200, 'Membership fixture login failed'
    return data['token']

def role(board, username):
    with sqlite3.connect(DATABASE) as db:
        row = db.execute('SELECT role FROM kb_members WHERE board_id=? AND username=?', (board, username)).fetchone()
        return row[0] if row else None

site_admin = login('rest-owner')
board_owner = login('rest-other')
member = login('rest-member')
board = BOARDS['otherBoardId']
base = '/api/boards/'+str(board)
path = base+'/members/rest-member'
assert call(path+'/add', 'POST', {'action': 'add', 'role': 'admin'})[0] == 401
assert call(path+'/add', 'POST', {'action': 'add', 'role': 'admin'}, member)[0] == 403
status, data = call(path+'/add', 'POST', {'action': 'add', 'role': 'admin'}, board_owner)
assert status == 200, ('Named admin addition failed', status)
assert data == [{'_id': str(board), 'title': "Other user's private board"}]
assert role(board, 'rest-member') == 'board-admin'
def member_data(token, name='rest-member'):
    status, document = call(base, token=token)
    assert status == 200
    return next(m for m in document['members'] if m['userId'] == name)

def change(data, token=board_owner):
    return call(path, 'POST', data, token)

def assert_minimal(data):
    assert data == [{'_id': str(board), 'title': "Other user's private board"}]

assert member_data(member)['isAdmin'] is True
# Add is idempotent, not a hidden role-change endpoint.
assert call(path+'/add', 'POST', {'action': 'add', 'role': 'worker'}, board_owner)[0] == 200
assert role(board, 'rest-member') == 'board-admin'
assert change({'role': 'worker'}, member)[0] == 200
assert call(base, token=member)[0] == 403, 'Combined Worker flag denies whole-board REST read'
current = member_data(board_owner)
assert current['isAdmin'] is True and current['isWorker'] is True, 'Self role update must preserve admin'
assert role(board, 'rest-member') == 'board-admin'
assert change({'role': 'readonly'}) == (200, 1)
assert member_data(member)['isReadOnly'] is True
for suffix, body in [('/add', {'action': 'add', 'role': 'admin'}),
                     ('', {'role': 'admin'}), ('/remove', {'action': 'remove'})]:
    assert call(base+'/members/missing-user'+suffix, 'POST', body, member)[0] == 403
assert role(board, 'rest-member') == 'read-only'
# All current named aliases, including trimming/case and individual flags.
for alias, expected in [(' ADMIN ', 'board-admin'), ('normal', 'normal'), ('member', 'normal'),
    ('nocomments', 'no-comments'), ('comment', 'comment-only'), ('commentOnly', 'comment-only'),
    ('worker', 'worker'), ('normalAssignedOnly', 'normal-assigned-only'),
    ('commentAssignedOnly', 'comment-assigned-only'), ('readOnly', 'read-only'),
    ('readAssignedOnly', 'read-assigned-only')]:
    assert change({'role': alias}) == (200, 1), 'Named role failed: '+alias
    assert role(board, 'rest-member') == expected
assert change({'isNormalAssignedOnly': True, 'isNoComments': 'true', 'isAdmin': 'FALSE'}) == (200, 1)
assert role(board, 'rest-member') == 'normal-assigned-only', 'WeKan flag precedence changed'
assert call(base, token=member)[0] == 403, 'Assigned/no-comments flags deny whole-board REST read'
current = member_data(board_owner)
assert current['isNormalAssignedOnly'] is True and current['isNoComments'] is True and current['isAdmin'] is False
assert change({'role': 'normal', 'isAdmin': True, 'isReadOnly': True}) == (200, 1)
assert call(path+'/set', 'POST', {'role': 'admin'}, board_owner)[0] == 404
assert call(path, token=board_owner)[0] == 405
assert all(not value for key, value in member_data(member).items() if key not in ('userId', 'isActive'))
for body in [{'role': 'superuser'}, {'role': {}}, {'isAdmin': {'$ne': False}}]:
    status, data = change(body)
    assert status == 400 and set(data) == {'error'}
    assert role(board, 'rest-member') == 'normal'
for action in ['read', 'remove', '']:
    status, data = call(path+'/add', 'POST', {'action': action, 'role': 'normal'}, board_owner)
    assert status == 400 and set(data) == {'error'}, 'Invalid action must never return a user document'
assert call(base+'/members/no-such-user/add', 'POST', {'action': 'add'}, board_owner) == (200, None)
assert change({'isNoComments': True, 'isWorker': True}) == (200, 1)
assert call(path+'/remove', 'POST', {'action': 'remove'}, board_owner)[0] == 200
assert role(board, 'rest-member') is None
inactive = member_data(board_owner)
assert inactive['isActive'] is False and inactive['isAdmin'] is False
assert inactive['isNoComments'] is True and inactive['isWorker'] is True, 'Removal lost non-admin flags'
assert call('/api/users/rest-member/boards', token=member) == (200, [])
assert call(base, token=member)[0] == 403
assert change({'role': 'admin', 'isActive': True}) == (200, 1)
assert member_data(board_owner)['isActive'] is False and member_data(board_owner)['isAdmin'] is True
assert call(base, token=member)[0] == 403, 'Inactive admin flags granted board access'
assert call(path+'/add', 'POST', {'action': 'add', 'role': 'readonly'}, board_owner)[0] == 200
assert member_data(board_owner)['isActive'] is True
assert member_data(board_owner)['isReadOnly'] is True and member_data(board_owner)['isAdmin'] is False
assert member_data(board_owner)['isWorker'] is False, 'Reactivation retained old flags'
assert call(path+'/remove', 'POST', {'action': 'remove'}, board_owner)[0] == 200
assert role(board, 'rest-member') is None
assert call(base, token=member)[0] == 403
# Global REST reads follow checkBoardAccess independently of membership
# mutation scope; neither operation silently creates board membership.
assert call(base, token=site_admin)[0] == 200
assert call(path+'/add', 'POST', {'action': 'add', 'role': 'admin'}, site_admin)[0] == 200
assert role(board, 'rest-member') == 'board-admin'
assert role(board, 'rest-owner') is None and call(base, token=site_admin)[0] == 200
# Another administrator may replace/remove the legacy owner's implicit role.
owner_path = base+'/members/rest-other'
assert call(owner_path, 'POST', {'role': 'normal'}, site_admin) == (200, 1)
assert role(board, 'rest-other') == 'normal'
assert member_data(board_owner, 'rest-other')['isAdmin'] is False
with sqlite3.connect(DATABASE) as db:
    assert db.execute('SELECT value FROM kb_user_meta WHERE board_id=? AND username=? AND setting=?', (board, 'rest-other', 'star')).fetchone() == ('1',), 'Legacy owner preference was lost'
assert call(owner_path, 'POST', {'role': 'admin'}, site_admin) == (200, 1)
status, data = call(owner_path+'/remove', 'POST', {'action': 'remove'}, board_owner)
assert status == 200
assert_minimal(data)
assert role(board, 'rest-other') is None
assert call(base, token=board_owner)[0] == 403
status, data = call(path+'/remove', 'POST', {'action': 'remove'}, member)
assert status == 200
assert_minimal(data)
assert role(board, 'rest-member') == 'board-admin', 'Removing the last administrator must be idempotent'
assert change({'role': 'normal'}, site_admin)[0] == 400
assert role(board, 'rest-member') == 'board-admin'
orphan = '/api/boards/'+str(BOARDS['orphanBoardId'])
assert call(orphan, token=site_admin)[0] == 200
assert call(orphan+'/members/rest-owner/add', 'POST', {'action': 'add', 'role': 'admin'}, site_admin)[0] == 200
assert call(orphan, token=site_admin)[0] == 200, 'Explicit site-admin recovery did not restore board access'
with sqlite3.connect(DATABASE) as db:
    assert db.execute('SELECT admin FROM users WHERE username=?', ('rest-member',)).fetchone()[0] == 0, 'Board role changed a site administrator bit'
# Even a site admin preserves their existing board-admin bit on a self role
# update; an explicit add is the source API's path for joining as an admin.
assert call(base+'/members/rest-owner/add', 'POST', {'action': 'add', 'role': 'readonly'}, site_admin)[0] == 200
assert call(base+'/members/rest-owner', 'POST', {'role': 'admin'}, site_admin) == (200, 1)
assert role(board, 'rest-owner') == 'normal'
assert call(base+'/members/rest-owner/remove', 'POST', {'action': 'remove'}, site_admin)[0] == 200
assert role(board, 'rest-owner') is None
assert call(base+'/members/rest-owner', 'POST', {'role': 'admin'}, site_admin) == (200, 1)
assert member_data(member, 'rest-owner')['isAdmin'] is False, 'Inactive self-update promoted its admin bit'
assert call(base+'/members/rest-owner', 'POST', {'role': 'admin'}, member) == (200, 1)
assert member_data(member, 'rest-owner')['isActive'] is False
assert member_data(member, 'rest-owner')['isAdmin'] is True
assert call(base+'/members/rest-owner', 'POST', {'role': 'worker'}, site_admin) == (200, 1)
assert member_data(member, 'rest-owner')['isAdmin'] is True
assert call(base, token=site_admin)[0] == 200, 'Global administrator REST override follows source without restoring membership'
assert change({'role': 'normal'}, site_admin)[0] == 400, 'Inactive administrators were counted as active'
assert call(path+'/remove', 'POST', {'action': 'remove'}, member)[0] == 200
assert role(board, 'rest-member') == 'board-admin'
subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
    env={**os.environ, 'WEBA_TEST_MODE': 'member-scope', 'WEBA_API_REQUEST': '1'}, check=True)
print('Membership REST: roles/combined flags, add idempotency, denied writes, minimal responses, owner changes, last admin and explicit recovery passed')
