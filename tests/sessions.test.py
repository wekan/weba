"""Real native sessions must expire across credential and account lifecycles."""
import http.cookiejar
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ['WEBA_TEST_URL']
PASSWORD = os.environ['WEBA_TEST_PASSWORD']
DATABASE = Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']

class Native:
    def __init__(self, username, password):
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        page = self.get()
        self.prefix = re.search(r'id="(@\d+)\.WebTextName"', page)[1]
        self.command(['raise', None, 'open', [], False])
        self.set('WebTextName', username)
        self.set('WebTextPass', password)
        self.click('WebButtonLogin')
        page = self.get()
        assert 'BoardTitle' in page, 'Native fixture login failed'
        self.prefix = re.search(r'id="(@\d+)\.BoardTitle"', page)[1]
        self.command(['raise', None, 'open', [], False])

    def get(self):
        return self.client.open(BASE, timeout=15).read().decode()

    def command(self, value):
        request = urllib.request.Request(BASE+'/x',
            data=urllib.parse.urlencode({'c': json.dumps(value)}).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded', 'X-WeBa-Request': '1'})
        return self.client.open(request, timeout=15).read().decode()

    def set(self, field, value):
        return self.command(['update', self.prefix+'.'+field, 'text', value, True])

    def click(self, field):
        return self.command(['raise', self.prefix+'.'+field, 'click', [], False])

    def assert_revoked(self, marker):
        # Bypass visible navigation: exercise a stale native action directly.
        self.set('BoardTitle', marker)
        self.click('NewBoard')
        with sqlite3.connect(DATABASE) as db:
            assert db.execute('SELECT COUNT(*) FROM kb_boards WHERE title=?', (marker,)).fetchone()[0] == 0, 'Stale native session could still write'
        assert 'WebTextName' in self.get(), 'Revoked native session must return to login'


def fixture(mode):
    subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_TEST_MODE': mode}, check=True)

def api(path, token=None, credentials=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(BASE+path, headers=headers,
        data=json.dumps(credentials).encode() if credentials else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())


def token_for(username, password):
    status, data = api('/users/login', credentials={'username': username, 'password': password})
    assert status == 200, 'API fixture login failed'
    return data['token']


def token_status(token):
    return api('/api/users/rest-owner/boards', token=token)[0]


owner_token = token_for('rest-owner', PASSWORD)
assert token_status(owner_token) == 200
owner = Native('rest-owner', PASSWORD)
other_owner_session = Native('rest-owner', PASSWORD)
normal = Native('rest-other', PASSWORD)
owner.click('Profile')
owner.set('OldPassword', 'incorrect')
owner.set('NewPassword', PASSWORD+'-changed')
assert 'incorrect' in owner.click('ChangePassword')
assert token_status(owner_token) == 200, 'Rejected password change revoked an API token'
# A rejected old password must leave the other session valid.
assert 'rest-owner' in other_owner_session.click('Profile')
owner.set('OldPassword', PASSWORD)
owner.set('NewPassword', PASSWORD+'-changed')
assert 'Password&nbsp;changed' in owner.click('ChangePassword')
other_owner_session.assert_revoked('Revoked after password change')
assert token_status(owner_token) == 401, 'Native password change left an API token valid'
reset_token = token_for('rest-owner', PASSWORD+'-changed')
# The changing browser retains its session, while an administrator reset (even
# to the same password) invalidates it.
owner.set('BoardTitle', 'Current password-change session')
owner.click('NewBoard')
with sqlite3.connect(DATABASE) as db:
    assert db.execute('SELECT COUNT(*) FROM kb_boards WHERE title=?', ('Current password-change session',)).fetchone()[0] == 1
fixture('reset')
owner.assert_revoked('Revoked after reset')
assert token_status(reset_token) == 401, 'Administrator reset left an API token valid'
Native('rest-owner', PASSWORD+'-changed')
normal_token = token_for('rest-other', PASSWORD)
fixture('recreate-other')
assert api('/api/users/rest-other/boards', token=normal_token)[0] == 401, 'Recreated account inherited an API token'
normal.assert_revoked('Revoked after account recreation')
Native('rest-other', PASSWORD)
print('Native sessions: failed/successful password changes, current-session retention, administrator reset and same-name recreation passed')
