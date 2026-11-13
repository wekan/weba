"""Actual HTTP lossless requests, scoped card writes and all-table rollback."""
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

    def description():
        return db.execute('SELECT description FROM kb_cards WHERE id=?', (card,)).fetchone()[0]

    def put(payload, token=owner):
        return call(scoped, token, 'PUT', payload)

    def raw(body):
        request = urllib.request.Request(base+scoped, method='PUT', headers={'Content-Type': 'application/json', 'Authorization': 'Bearer '+owner}, data=body)
        try:
            response = urllib.request.urlopen(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read().decode('utf-8'))

    def core():
        return db.execute('SELECT id,board_id,title,lane,status,assignee,labels,due_day,archived FROM kb_cards WHERE id=?', (card,)).fetchone()

    for value in ('Write'+suffix, '\0', '\0prefix\0tail', 'Lone\ud800tail', 'Low\udfff\0tail', 'Pair 😀'+suffix, '', None, '  whitespace\n\t', "'; DROP TABLE users; --"+suffix):
        prior_core = core()
        status, data, _ = put({'description': value})
        assert (status, data) == (200, {'_id': str(card)})
        expected = '' if value is None else value
        assert description() == expected, (ascii(value), ascii(description()))
        assert core() == prior_core, 'description changed unrelated full card fields'
        assert call(scoped, owner)[1]['description'] == expected
    assert raw(b'{"description":"first","description":"last\\u0000tail"}')[0] == 200
    assert description() == 'last\0tail'
    assert raw('{"description":"Direct UTF-8 Ω😀"}'.encode())[0] == 200
    assert description() == 'Direct UTF-8 Ω😀'
    for value in (False, True, 0, 1.5, [], {}, ['text']):
        before = frame()
        assert put({'description': value, 'dueAt': 0, 'members': []})[0] == 400
        assert frame() == before
    for key in ('', 'description\0unknown', 'members\0', '__proto__'):
        before = frame()
        assert put({key: 'FORGED', 'description': 'do not apply'})[0] == 400
        assert frame() == before
    for body in (b'{"description":undefined}', b'{"description":NaN}', b'{"description":Infinity}', b'{"description":"\x00"}', b'{"description":"\xff"}', b'{"description":"\xed\xa0\x80"}', b'{"description":"x"}tail', b'["x"]', b'null'):
        before = frame()
        assert raw(body)[0] == 400
        assert frame() == before

    # Unknown NUL identities cannot become existing member-name aliases.
    status, _, _ = put({'description': 'Combined'+suffix, 'members': ['rest-other', 'rest\0-other'], 'assignees': ['rest-native-assigned', 'rest-native\0-assigned'], 'dueAt': 123})
    assert status == 200 and description() == 'Combined'+suffix
    value = call(scoped, owner)[1]
    assert value['members'] == ['rest-other'] and value['assignees'] == ['rest-native-assigned']
    assert value['dueAt'] == '1970-01-01T00:00:00.123Z'
    for token, status in ((None, 401), (reader, 403), (assigned, 403), (outsider, 403)):
        before = frame()
        assert put({'description': 'DENIED'+suffix, 'members': [], 'dueAt': 0}, token)[0] == status
        assert frame() == before
    assert put({'description': 'Global'+suffix}, admin)[0] == 200
    assert description() == 'Global'+suffix

    # Every injected effect happens after text/people/dates have already changed.
    # The final guarded check must roll back the entire operation and trigger.
    triggers = {
        'sql': (500, "SELECT RAISE(ABORT,'private write fixture');"),
        'flag': (403, f"INSERT INTO kb_member_flags(board_id,username,flag) VALUES({board},'rest-other','isReadAssignedOnly');"),
        'token': (401, "DELETE FROM api_tokens WHERE username='rest-other';"),
        'actor': (401, "DELETE FROM users WHERE username='rest-other';"),
        'target': (404, f"UPDATE kb_cards SET board_id=2147483647 WHERE id={card};"),
        'archive': (409, f"UPDATE kb_cards SET archived=1 WHERE id={card};"),
        'suffix': (409, f"UPDATE kb_cards SET description=CAST(x'{('Substituted'+suffix).encode().hex()}' AS TEXT) WHERE id={card};"),
        'history-token': (401, "DELETE FROM api_tokens WHERE username='rest-other';"),
        'history-suffix': (409, f"UPDATE kb_cards SET description=CAST(x'{('History substituted'+suffix).encode().hex()}' AS TEXT) WHERE id={card};"),
    }
    for name, (expected, effect) in triggers.items():
        event = f"AFTER INSERT ON kb_activity WHEN NEW.board_id={board} AND NEW.message='Changed card description'" if name.startswith('history-') else f'AFTER UPDATE OF description ON kb_cards WHEN NEW.id={card}'
        db.execute(f'CREATE TRIGGER api_write_fail {event} BEGIN {effect} END'); db.commit()
        before = frame()
        status, data, body = put({'description': 'Rollback'+suffix, 'members': [], 'assignees': [], 'dueAt': 456})
        assert status == expected, (name, status, data)
        assert b'private write fixture' not in body
        assert frame() == before, name
        db.execute('DROP TRIGGER api_write_fail'); db.commit()
        assert put({'description': 'Retry'+suffix})[0] == 200
        assert description() == 'Retry'+suffix
    # Scoped archived PUT keeps the existing no-op acknowledgement contract.
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    before = frame()
    assert put({'description': 'No archive write'+suffix})[0] == 200
    assert frame() == before
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()

    # Lossless credential parsing must never remove a unit and authenticate an alias.
    for username, password in (('rest-other\0', os.environ['WEBA_TEST_PASSWORD']), ('rest-other', os.environ['WEBA_TEST_PASSWORD']+'\0'), ('rest-other', os.environ['WEBA_TEST_PASSWORD']+'\ud800')):
        status, data, _ = call('/users/login', method='POST', data={'username': username, 'password': password})
        assert status == 401 and 'token' not in data
print('API write text: exact NUL/Unicode/lone/empty/null/duplicate/UTF-8 JSON, invalid shape/keys/bytes, combined people/dates, credential alias refusal, role/global/archive scopes and full SQL/final flag/token/actor/card/archive/suffix rollback/retry passed')
