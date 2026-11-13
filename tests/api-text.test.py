"""Actual HTTP full-text DTOs and exact SQL identities under checked API scope."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import urllib.error
import urllib.request

base = os.environ['WEBA_TEST_URL']
root = Path(__file__).resolve().parent

def native(mode='', **extra):
    env = {**os.environ, 'WEBA_API_REQUEST': '0', 'WEBA_NATIVE_MODE': mode, **extra}
    return json.loads(subprocess.check_output([env['GBX'], '-s', 'NativeTextFixture', env['WEBA_TEST_PROJECT']], env=env))

seed = native()
board = seed['board']
card = seed['items'][0]['card']
list_id = seed['items'][0]['list']
for letter, item in zip('AB', seed['items']):
    assert item['lane'] == "Lane\0Ω😀'<tag>"+letter
    assert item['title'] == "List\0Ω😀'<tag>"+letter
native('copy-seed', WEBA_NATIVE_BOARD=str(board), WEBA_NATIVE_CARD=str(card))


def call(route, token=None, method='GET', data=None):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read()
        assert response.headers.get_content_type() == 'application/json'
        assert response.headers.get('Cache-Control') == 'no-store'
        value = json.loads(raw.decode('utf-8'))
        return response.status, value, raw


def login(name):
    status, data, _ = call('/users/login', method='POST', data={'username': name, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200
    return data['token']

owner, admin, reader, assigned, outsider = (login(name) for name in ('rest-other', 'rest-owner', 'rest-native-reader', 'rest-native-assigned', 'rest-member'))
prefix = f'/api/boards/{board}'
scoped = prefix+f'/lists/{list_id}/cards/{card}'
listed = prefix+f'/lists/{list_id}/cards'
routes = [prefix, prefix+'/lists', prefix+'/swimlanes', listed, scoped, f'/api/cards/{card}']
suffix = "\0Ω😀'<tag>tail"
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    db.text_factory = lambda value: value.decode('utf-8', 'surrogatepass')

    def frame():
        tables = [name for name, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        return {name: sorted(db.execute('SELECT * FROM "'+name.replace('"', '""')+'"').fetchall(), key=repr) for name in tables}

    def text(table, field, identity, value):
        db.execute(f'UPDATE {table} SET {field}=CAST(? AS TEXT) WHERE id=?', (value.encode('utf-8', 'surrogatepass'), identity))
        db.commit()

    text('kb_boards', 'title', board, 'Board'+suffix)
    text('kb_cards', 'title', card, 'Card'+suffix)
    text('kb_cards', 'description', card, 'Body'+suffix)
    lane_id = db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?', (board, seed['items'][0]['lane'])).fetchone()[0]
    checklist_id = db.execute("SELECT id FROM kb_entries WHERE board_id=? AND card_id=? AND kind='checklist'", (board, card)).fetchone()[0]
    before = frame()
    for token in (owner, admin, reader):
        for route in routes:
            status, data, raw = call(route, token)
            assert status == 200, (route, status, data)
            assert b'__weba_' not in raw and b'BINARY-CANARY' not in raw
            if route == prefix:
                assert data['title'] == 'Board'+suffix
            elif route == prefix+'/lists':
                assert next(row for row in data if row['_id'] == str(list_id))['title'] == seed['items'][0]['title']
            elif route == prefix+'/swimlanes':
                assert next(row for row in data if row['_id'] == str(lane_id))['title'] == seed['items'][0]['lane']
            else:
                value = data[0] if route == listed else data
                assert value['title'] == 'Card'+suffix and value['description'] == 'Body'+suffix
                assert value['swimlaneId'] == str(lane_id)
                if route != listed:
                    assert value['checklists'][0]['title'] == 'Browser checks'+"\0Ω😀'copy"
                    assert value['checklists'][0]['items'][0]['title'] == 'Browser item'+"\0Ω😀'copy"
    # Distinct suffixes after a common NUL prefix must resolve different lanes.
    for item in seed['items']:
        expected_lane = db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?', (board, item['lane'])).fetchone()[0]
        status, value, _ = call('/api/cards/'+str(item['card']), owner)
        assert status == 200 and value['swimlaneId'] == str(expected_lane)
    status, data, _ = call('/api/users/rest-other/boards', owner)
    assert status == 200 and next(row for row in data if row['_id'] == str(board))['title'] == 'Board'+suffix
    for token, expected in ((None, 401), (assigned, 403), (outsider, 403)):
        for route in routes:
            status, data, _ = call(route, token)
            assert status == expected and 'error' in data, (route, status)
    assert call(prefix+f'/lists/{seed["items"][1]["list"]}/cards/{card}', owner)[0] == 404
    assert frame() == before, 'GET changed application/authentication data'

    # Compare both real single-card URLs to unchanged WeKan using independent SQL.
    oracle_env = {**os.environ, 'WEBA_TEST_BOARDS': json.dumps({'otherBoardId': board, 'otherCardId': card, 'otherListId': list_id})}
    subprocess.run([os.environ.get('NODE', 'node'), str(root/'card-read-conformance.test.cjs')], check=True, env=oracle_env)

    for value in ('', '\0', '\0prefix', "'; DROP TABLE users; --"+suffix, 'Lone\ud800\0tail', 'Pair 😀'+suffix):
        text('kb_cards', 'title', card, value)
        text('kb_cards', 'description', card, value)
        before = frame()
        for route in (listed, scoped, f'/api/cards/{card}'):
            status, data, raw = call(route, owner)
            assert status == 200
            data = data[0] if route == listed else data
            assert data['title'] == value and data['description'] == value
            if '\ud800' in value:
                assert b'\\ud800' in raw.lower(), 'lone unit must use valid JSON escape'
        assert frame() == before

    # Preserve existing card DTO policy: SQL NULL normalizes to an empty string.
    db.execute('UPDATE kb_cards SET description=NULL WHERE id=?', (card,)); db.commit()
    assert call(scoped, owner)[1]['description'] == ''
    text('kb_cards', 'title', card, 'Card'+suffix)
    text('kb_cards', 'description', card, 'Body'+suffix)
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = frame()
    assert call(scoped, owner)[0] == 404
    assert call(f'/api/cards/{card}', owner)[1]['title'] == 'Card'+suffix
    assert call(listed, owner)[1] == []
    assert frame() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()

    # A failed data read must stay opaque and leave no persistent read authority.
    db.execute('ALTER TABLE kb_entries RENAME TO api_text_entries')
    db.execute('CREATE VIEW kb_entries AS SELECT * FROM private_missing_api_text_source'); db.commit()
    before = frame()
    status, data, raw = call(scoped, admin)
    assert status == 500 and b'private_missing_api_text_source' not in raw
    assert frame() == before
    db.execute('DROP VIEW kb_entries'); db.execute('ALTER TABLE api_text_entries RENAME TO kb_entries'); db.commit()
    before = frame()
    assert call(scoped, owner)[1]['title'] == 'Card'+suffix
    assert call(scoped, outsider)[0] == 403
    assert frame() == before

    status, _, _ = call(prefix+'/members/rest-native-reader/remove', admin, 'POST', {'action': 'remove'})
    assert status == 200
    before = frame()
    assert call(scoped, reader)[0] == 403
    assert frame() == before
print('API complete text: real board/list/lane/card/user-board/checklist DTOs, exact lane IDs, original single-card source, NUL/Unicode/lone/empty/SQL-literal wire text, owner/reader/global/assigned/foreign scope, no-write GETs, archive semantics, opaque failure/retry and revocation passed')
