"""Force a real member API transaction commit failure, then retry in-process."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import time
import urllib.request

project = Path(os.environ['WEBA_TEST_PROJECT'])
base = os.environ['WEBA_TEST_URL']
board = json.loads(os.environ['WEBA_TEST_BOARDS'])['otherBoardId']

def post(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer '+token
    request = urllib.request.Request(base+path, data=json.dumps(data).encode(), headers=headers)
    with urllib.request.urlopen(request, timeout=15) as response:
        assert response.status == 200
        return json.loads(response.read())

token = post('/users/login', {'username': 'rest-owner', 'password': os.environ['WEBA_TEST_PASSWORD']})['token']
path = '/api/boards/'+str(board)+'/members/'
post(path+'rest-other/add', {'action': 'add', 'role': 'admin'}, token)
post(path+'rest-other', {'role': 'admin'}, token)
post(path+'rest-member/add', {'action': 'add', 'role': 'normal'}, token)
post(path+'rest-member', {'role': 'normal'}, token)
reader = sqlite3.connect(project / 'database.db', timeout=1)
process = None
tables = ('kb_item_changes', 'kb_members', 'kb_removed_members', 'kb_member_flags', 'kb_history', 'kb_activity', 'kb_boards', 'kb_user_meta')
def rows(table):
    return sorted(reader.execute('SELECT * FROM '+table).fetchall(), key=repr)
try:
    for action in ('set', 'remove', 'inactive-set', 'add'):
        before = {table: rows(table) for table in tables}
        reader.execute('BEGIN')
        reader.execute('SELECT role FROM kb_members').fetchall()
        process = subprocess.Popen([os.environ['GBX'], '-s', 'ApiFixture', str(project)],
            env={**os.environ, 'WEBA_TEST_MODE': 'member-commit', 'WEBA_TEST_MEMBER_ACTION': action, 'WEBA_API_REQUEST': '1'},
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        deadline = time.monotonic() + 15
        while not (project / ('member-commit-failed-'+action)).exists():
            if process.poll() is not None:
                raise AssertionError(process.communicate()[0])
            assert time.monotonic() < deadline, 'Member commit failure signal timed out: '+action
            time.sleep(.02)
        reader.rollback()
        for table in tables:
            assert rows(table) == before[table], 'Failed '+action+' changed '+table
        (project / ('member-reader-released-'+action)).write_text('ready')
        output, _ = process.communicate(timeout=15)
        assert process.returncode == 0, output
        role = reader.execute('SELECT role FROM kb_members WHERE board_id=? AND username=?', (board, 'rest-member')).fetchone()
        removed = reader.execute('SELECT role FROM kb_removed_members WHERE board_id=? AND username=?', (board, 'rest-member')).fetchone()
        flags = reader.execute('SELECT flag FROM kb_member_flags WHERE board_id=? AND username=?', (board, 'rest-member')).fetchall()
        if action == 'remove':
            assert role is None and removed == ('read-only',) and flags == [('isReadOnly',)]
        elif action == 'inactive-set':
            assert role is None and removed == ('board-admin',) and flags == [('isAdmin',)]
        elif action == 'add':
            assert role == ('normal',) and removed is None and flags == []
        else:
            assert role == ('read-only',) and removed is None and flags == [('isReadOnly',)]
        print(action+': '+output.strip())

finally:
    reader.close()
    if process is not None and process.poll() is None:
        process.kill()
        process.communicate()
