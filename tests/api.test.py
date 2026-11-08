"""Real Bearer-token and authorization contracts; disposable Gambas/SQLite data.

Contracts: WeKan server/apiAuthRoutes.js and playwright spec 17 logout revocation.
This is not evidence that the remaining WeKan REST/UI suites already pass.
"""
import hashlib
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
from datetime import datetime, timezone

BASE = os.environ['WEBA_TEST_URL']
PASSWORD = os.environ['WEBA_TEST_PASSWORD']
BOARDS = json.loads(os.environ['WEBA_TEST_BOARDS'])
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(path, method='GET', data=None, token=None, raw=None, headers=None):
    body = raw if raw is not None else json.dumps(data).encode() if data is not None else None
    values = {'Content-Type': 'application/json'}
    if token is not None:
        values['Authorization'] = 'Bearer ' + token
    values.update(headers or {})
    request = urllib.request.Request(BASE + path, data=body, method=method, headers=values)
    try:
        response = client.open(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        text = response.read()
        try:
            payload = json.loads(text)
        except ValueError:
            payload = None
        return response.status, payload, response.headers


def login(username='rest-owner', password=PASSWORD):
    status, data, headers = call('/users/login', 'POST', {'username': username, 'password': password})
    assert status == 200, ('Login failed', status)
    assert len(data['token']) == 43 and data['id'] == username
    assert datetime.fromisoformat(data['tokenExpires'].replace('Z', '+00:00')) > datetime.now(timezone.utc)
    assert headers['Cache-Control'] == 'no-store'
    assert not headers.get('Set-Cookie'), 'API login must not create a browser session'
    return data['token']


# Real native login establishes a cookie. API requests must still require Bearer.
page = client.open(BASE, timeout=15).read().decode()
prefix = re.search(r'id="(@\d+)\.WebTextName"', page)[1]
for command in [['raise', None, 'open', [], False],
                ['update', prefix+'.WebTextName', 'text', 'rest-owner', True],
                ['update', prefix+'.WebTextPass', 'text', PASSWORD, True],
                ['raise', prefix+'.WebButtonLogin', 'click', [], False]]:
    request = urllib.request.Request(BASE+'/x', data=urllib.parse.urlencode({'c': json.dumps(command)}).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded', 'X-WeBa-Request': '1'})
    client.open(request, timeout=15).read()
assert call('/api/users/rest-owner/boards')[0] == 401, 'Native cookie must not authenticate REST'
assert call('/api/users/rest-other', 'DELETE')[0] == 401, 'Native cookie must not authorize REST deletion'
assert call('/api/boards/'+str(BOARDS['boardId'])+'/lists/1/cards/1', 'PUT', {'members': []})[0] == 401, 'Native cookie must not authorize REST card PUT'
assert call('/users/login', 'POST', raw=b'[')[0] == 400
assert call('/users/login', 'POST', data=[])[0] == 400
wrong = call('/users/login', 'POST', {'username': 'rest-owner', 'password': 'wrong'})
missing = call('/users/login', 'POST', {'username': 'missing-user', 'password': 'wrong'})
assert wrong[0] == missing[0] == 401 and wrong[1] == missing[1]
first = login()
second = login()
assert first != second
status, rows, headers = call('/api/users/rest-owner/boards', token=first)
assert status == 200 and [row['_id'] for row in rows] == [str(BOARDS['boardId'])]
assert headers['Cache-Control'] == 'no-store'
assert call('/api/boards/'+str(BOARDS['boardId']), token=first)[1]['title'] == 'Private owner board'
assert call('/api/boards/'+str(BOARDS['otherBoardId']), token=first)[0] == 200, 'Global administrator reads follow WeKan checkBoardAccess'
assert call('/api/users/rest-other/boards', token=first)[0] == 403
assert call('/api/boards/1.0', token=first)[0] == 404
assert call('/api/boards/'+str(BOARDS['boardId']), token='forged')[0] == 401
# Independently inspect persistence: no raw token or password is a database token.
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    persisted = db.execute('SELECT digest, username FROM api_tokens').fetchall()
    assert (hashlib.sha256(first.encode()).hexdigest(), 'rest-owner') in persisted
    assert all(first not in row and second not in row for row in persisted)
assert call('/users/logout', 'POST', {'all': 'true'}, token=first)[0] == 400
assert call('/users/logout', 'POST', {}, token=first)[0] == 200
assert call('/api/users/rest-owner/boards', token=first)[0] == 401
assert call('/api/users/rest-owner/boards', token=second)[0] == 200
third = login()
assert call('/users/logout', 'POST', {'all': True}, token=second)[0] == 200
assert call('/api/users/rest-owner/boards', token=second)[0] == 401
assert call('/api/users/rest-owner/boards', token=third)[0] == 401
expired = login()
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    db.execute('UPDATE api_tokens SET expires_at=0 WHERE digest=?', (hashlib.sha256(expired.encode()).hexdigest(),))
assert call('/api/users/rest-owner/boards', token=expired)[0] == 401
before_reset = login()
reset_env = os.environ.copy()
reset_env['WEBA_TEST_MODE'] = 'reset'
subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']], check=True, env=reset_env)
assert call('/api/users/rest-owner/boards', token=before_reset)[0] == 401
login(password=PASSWORD+'-changed')
# Success resets the peer window; five failed attempts are admitted, then 429.
for _ in range(5):
    assert call('/users/login', 'POST', {'username': 'missing-user', 'password': 'wrong'})[0] == 401
status, _, headers = call('/users/login', 'POST', {'username': 'missing-user', 'password': 'wrong'})
assert status == 429 and int(headers['Retry-After']) > 0
print('REST authentication: real native-cookie isolation, hashed tokens, scoped reads, revocation/all, expiry, reset and throttle passed')
