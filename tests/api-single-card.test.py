"""Real single-card GET contents, role/scoped/archive boundaries and failure reset."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time
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

global_path = '/api/cards/'+card
before = time.time_ns() // 1000000
subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']], env={**os.environ, 'WEBA_TEST_MODE': 'single-card-content', 'WEBA_API_REQUEST': '0'}, check=True)
after = time.time_ns() // 1000000
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    def get(route=global_path, token=owner):
        return call(route, 'GET', token)
    assert get(token=None)[0] == 401
    assert get(path, token=None)[0] == 401
    def contents():
        return {table: sorted(db.execute('SELECT * FROM '+table).fetchall(), key=repr) for table in ('kb_cards', 'kb_entries', 'kb_item_changes', 'kb_history', 'kb_activity')}
    original = contents()
    status, document = get()
    assert status == 200 and document == get(path)[1]
    assert contents() == original, 'GET must not mutate card data/history/clocks'
    assert document['_id'] == card and document['boardId'] == board and document['listId'] == list_id
    assert document['archived'] is False and isinstance(document['sort'], int)
    assert document['members'] == ['rest-other']
    assert document['assignees'] == ['rest-other', 'rest-member']
    assert isinstance(document['modifiedAt'], str)
    checklist = document['checklists'][0]
    assert checklist['boardId'] == board and checklist['cardId'] == card and checklist['title'] == 'Checklist ää 中文'
    assert checklist['dueAt'] is None
    assert [item['title'] for item in checklist['items']] == ['First 😀', 'Second']
    assert [item['isFinished'] for item in checklist['items']] == [False, True]
    assert all(set(item) == {'_id', 'title', 'isFinished', 'dueAt'} and item['dueAt'] is None for item in checklist['items'])
    assert document['checklists'][1]['items'] == []
    for row in document['checklists']:
        epoch = int(datetime.fromisoformat(row['createdAt'].replace('Z', '+00:00')).timestamp()*1000)
        assert before-2 <= epoch <= after+2, (row['createdAt'], before, after)
    # Crafted stale/cross-card parent links must not expand the checklist query.
    foreign_card = db.execute('SELECT id FROM kb_cards WHERE board_id=? ORDER BY id', (fixture['boardId'],)).fetchone()[0]
    for parent_board, parent_card in ((fixture['boardId'], foreign_card), (board, foreign_card)):
        db.execute('INSERT INTO kb_entries(board_id,card_id,kind,parent_id,title,body,done,amount,author,value_type) VALUES(?,?,?,?,?,?,?,?,?,?)', (parent_board, parent_card, 'checkitem', int(checklist['_id']), 'PRIVATE-CHECKITEM-CANARY', '', 0, 0, 'rest-owner', 'text'))
    db.commit()
    assert 'PRIVATE-CHECKITEM-CANARY' not in json.dumps(get()[1])
    assert get(token=admin)[0] == 200
    assert get('/api/cards/'+str(foreign_card), token=owner)[0] == 403
    assert get(path.replace('/cards/'+card, '/cards/'+str(foreign_card)))[0] == 404
    assert get(path.replace('/lists/'+list_id, '/lists/2147483647'))[0] == 404
    for invalid in ('1.0', '0', '-1', '2147483647'):
        assert get('/api/cards/'+invalid)[0] == 404
    for role in ('admin', 'normal', 'readonly'):
        assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': role})[0] == 200
        assert get(token=member)[0] == 200 and get(path, token=member)[0] == 200
    for role in ('nocomments', 'comment', 'worker', 'normalAssignedOnly', 'commentAssignedOnly', 'readAssignedOnly'):
        assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'role': role})[0] == 200
        assert get(token=member) == (403, {'error': 'Forbidden'})
        assert get(path, token=member)[0] == 403
        assert get(path.replace('/cards/'+card, '/cards/2147483647'), token=member)[0] == 403
        assert get(path.replace('/cards/'+card, '/cards/1.0'), token=member)[0] == 403
        assert get(path.replace('/lists/'+list_id, '/lists/1.0'), token=member)[0] == 403
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, {'isAdmin': True, 'isWorker': True})[0] == 200
    assert get(token=member)[0] == 403 and get(path, token=member)[0] == 403
    assert call('/api/boards/'+board+'/members/rest-member/remove', 'POST', admin, {'action': 'remove'})[0] == 200
    assert get(token=member)[0] == 403 and get(path, token=member)[0] == 403
    assert get(token=admin)[0] == 200
    assert call('/api/boards/'+board+'/members/rest-member/add', 'POST', admin, {'action': 'add', 'role': 'normal'})[0] == 200
    assert put({'receivedAt': 0, 'startAt': -1.9, 'dueAt': '2026-06-20T00:30:40.123+03:30', 'endAt': 8640000000000000})[0] == 200
    dated = get()[1]
    assert dated['receivedAt'] == '1970-01-01T00:00:00.000Z'
    assert dated['startAt'] == '1969-12-31T23:59:59.999Z'
    assert dated['dueAt'] == '2026-06-19T21:00:40.123Z'
    assert dated['endAt'] == '+275760-09-13T00:00:00.000Z'
    assert get(path)[1] == dated
    for stamp, expected in ((8640000000000000, '+275760-09-13T00:00:00.000Z'), (-8640000000000000, '-271821-04-20T00:00:00.000Z')):
        assert put({'dueAt': stamp})[0] == 200
        assert get()[1]['dueAt'] == expected and get(path)[1]['dueAt'] == expected
    for value in ('', None, 'Literal <script> Ω 😀'):
        assert put({'description': value})[0] == 200
        assert get()[1]['description'] == (value or '')
    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    assert get()[0] == 200 and get()[1]['archived'] is True
    assert get(path) == (404, {'error': 'Card not found'})
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    assert get(path)[0] == 200
subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']], env={**os.environ, 'WEBA_TEST_MODE': 'single-card-read-scope', 'WEBA_API_REQUEST': '1'}, check=True)
print('Single-card GET: scoped/global fields, checklist isolation, exact text, UTC creation/change times, nine roles, archive distinction, missing/foreign privacy and SQL scope reset passed')
