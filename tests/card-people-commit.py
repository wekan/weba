"""Real COMMIT failures and same-process retries for both card people fields."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import time
import urllib.request

project = Path(os.environ['WEBA_TEST_PROJECT'])
base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
def request(path, method='POST', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer '+token
    call = urllib.request.Request(base+path, method=method, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(call, timeout=15) as response:
        assert response.status == 200
        return json.loads(response.read())
token = request('/users/login', data={'username': 'rest-owner', 'password': os.environ['WEBA_TEST_PASSWORD']})['token']
for field in ('members', 'assignees'):
    request('/api/boards/'+board+'/lists/'+list_id+'/cards/'+card+'/'+field+'/rest-member', 'DELETE', token=token)
reader = sqlite3.connect(project / 'database.db', timeout=1)
process = None
tables = ('kb_cards', 'kb_card_members', 'kb_card_people_order', 'kb_card_people_sequence', 'kb_card_assignees', 'kb_card_lists', 'kb_history', 'kb_activity')
def rows(table):
    return sorted(reader.execute('SELECT * FROM '+table).fetchall(), key=repr)
try:
    for field, native in (('members', False), ('assignees', False), ('members', True), ('replace', False)):
        for action in ('add', 'remove'):
            for signal in ('card-people-commit-failed', 'card-people-reader-released'):
                (project / signal).unlink(missing_ok=True)
            before = {table: rows(table) for table in tables}
            reader.execute('BEGIN')
            reader.execute('SELECT id FROM kb_cards').fetchall()
            process = subprocess.Popen([os.environ['GBX'], '-s', 'ApiFixture', str(project)],
                env={**os.environ, 'WEBA_TEST_MODE': 'card-people-commit', 'WEBA_API_REQUEST': '0' if native else '1',
                     'WEBA_TEST_NATIVE_CARD_PEOPLE': '1' if native else '0',
                     'WEBA_TEST_PERSON_FIELD': field, 'WEBA_TEST_PERSON_ACTION': action},
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            deadline = time.monotonic() + 15
            while not (project / 'card-people-commit-failed').exists():
                if process.poll() is not None:
                    raise AssertionError(process.communicate()[0])
                assert time.monotonic() < deadline, 'Card people COMMIT failure signal timed out'
                time.sleep(.02)
            reader.rollback()
            for table in tables:
                assert rows(table) == before[table], 'Failed '+field+' '+action+' changed '+table
            (project / 'card-people-reader-released').write_text('ready')
            output, _ = process.communicate(timeout=15)
            assert process.returncode == 0, output
            if field == 'replace':
                for name, expected in (('members', ['rest-member', 'rest-other', 'rest-member']), ('assignees', ['rest-other', 'rest-member', 'rest-other'])):
                    sequence = [row[0] for row in reader.execute('SELECT username FROM kb_card_people_sequence WHERE board_id=? AND card_id=? AND field=? ORDER BY sort_order', (board, card, name))]
                    assert sequence == (expected if action == 'add' else [])
                    actual = {row[0] for row in reader.execute('SELECT username FROM kb_card_'+name+' WHERE board_id=? AND card_id=?', (board, card))}
                    assert actual == (set(expected) if action == 'add' else set())
            else:
                table = 'kb_card_'+field
                count = reader.execute('SELECT COUNT(*) FROM '+table+' WHERE board_id=? AND card_id=? AND username=?', (board, card, 'rest-member')).fetchone()[0]
                assert count == (1 if action == 'add' else 0)
            print(('Native ' if native else 'REST ')+field+' '+action+': '+output.strip())
finally:
    reader.close()
    if process is not None and process.poll() is None:
        process.kill()
        process.communicate()
