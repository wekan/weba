"""Whole-board REST read roles, result fields and archive/scope boundaries."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

base = os.environ['WEBA_TEST_URL']
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board, list_id, card = (str(fixture[key]) for key in ('otherBoardId', 'otherListId', 'otherCardId'))
path = '/api/boards/'+board+'/lists/'+list_id+'/cards/'+card

def call(route, method='GET', token=None, data=None, escaped=True):
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

routes = ['/api/boards/'+board+suffix for suffix in ('', '/lists', '/swimlanes', '/cards_count', '/lists/'+list_id+'/cards', '/lists/'+list_id+'/cards_count')]
def role(value):
    assert call('/api/boards/'+board+'/members/rest-member', 'POST', admin, value)[0] == 200
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    for route in routes:
        assert call(route)[0] == 401
        # Existing board POST remains an unimplemented route; new read-only
        # container routes explicitly reject methods other than GET.
        assert call(route, 'POST', owner)[0] == (404 if route == routes[0] else 405), route
        assert call(route, token=admin)[0] == 200
    for value in ('admin', 'normal', 'readonly'):
        role({'role': value})
        for route in routes:
            assert call(route, token=member)[0] == 200, (value, route)
    for value in ('nocomments', 'comment', 'worker', 'normalAssignedOnly', 'commentAssignedOnly', 'readAssignedOnly'):
        role({'role': value})
        for route in routes:
            status, data = call(route, token=member)
            assert (status, data) == (403, {'error': 'Forbidden'}), (value, route, status, data)
    role({'isAdmin': True, 'isWorker': True})
    assert call(routes[0], token=member)[0] == 403
    role({'role': 'normal'})
    assert call('/api/boards/'+board+'/members/rest-member/remove', 'POST', admin, {'action': 'remove'})[0] == 200
    for route in routes:
        assert call(route, token=member)[0] == 403
    assert call('/api/boards/'+board+'/members/rest-member/add', 'POST', admin, {'action': 'add', 'role': 'normal'})[0] == 200
    status, lists = call(routes[1], token=owner)
    assert status == 200 and any(item['_id'] == list_id for item in lists)
    assert all(set(item) == {'_id', 'title', 'modifiedAt', 'cardsModifiedAt'} for item in lists)
    for rank in (-20, 0, 10):
        cursor = db.execute('INSERT INTO kb_cards(board_id,title,description,lane,status,assignee,labels,due_day,archived) VALUES(?,?,?,?,?,?,?,?,?)', (board, 'Order '+str(rank), '', 'Default', 'Todo', '', '', '', 0))
        added = cursor.lastrowid
        db.execute('INSERT INTO kb_card_lists(board_id,card_id,list_id) VALUES(?,?,?)', (board, added, list_id))
        db.execute('INSERT INTO kb_order(board_id,kind,item,sort_order) VALUES(?,?,?,?)', (board, 'card', str(added), rank))
    db.commit()
    expected = db.execute('SELECT COUNT(*) FROM kb_cards WHERE board_id=? AND archived=0', (board,)).fetchone()[0]
    assert call(routes[3], token=owner) == (200, {'board_cards_count': expected})
    status, cards = call(routes[4], token=owner)
    assert status == 200 and card in [item['_id'] for item in cards]
    assert call(routes[5], token=owner) == (200, {'list_cards_count': len(cards)})
    for item in cards:
        row = db.execute('SELECT title,description,lane FROM kb_cards WHERE id=?', (item['_id'],)).fetchone()
        assert item['title'] == row[0] and item['description'] == (row[1] or ''), (item, row)
        lane_id = db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?', (board, row[2])).fetchone()[0]
        assert item['swimlaneId'] == str(lane_id)
        assert isinstance(item['assignees'], list) and isinstance(item['sort'], int)
    oracle = db.execute("SELECT c.id,COALESCE(o.sort_order,c.id) FROM kb_cards c JOIN kb_card_lists l ON l.card_id=c.id AND l.board_id=c.board_id LEFT JOIN kb_order o ON o.board_id=c.board_id AND o.kind='card' AND o.item=CAST(c.id AS TEXT) WHERE c.board_id=? AND l.list_id=? AND c.archived=0 ORDER BY COALESCE(o.sort_order,c.id),c.id", (board, list_id)).fetchall()
    assert [(item['_id'], item['sort']) for item in cards] == [(str(identity), rank) for identity, rank in oracle]
    for item in cards:
        for field, epoch in db.execute('SELECT field,epoch_ms FROM kb_card_dates WHERE card_id=?', (item['_id'],)):
            seconds, millis = divmod(epoch, 1000)
            expected_iso = datetime.fromtimestamp(seconds, timezone.utc).replace(microsecond=millis*1000).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
            assert item[field] == expected_iso

    db.execute('UPDATE kb_cards SET archived=1 WHERE id=?', (card,)); db.commit()
    assert card not in [item['_id'] for item in call(routes[4], token=owner)[1]]
    assert call(routes[3], token=owner) == (200, {'board_cards_count': expected-1})
    db.execute('UPDATE kb_cards SET archived=0 WHERE id=?', (card,)); db.commit()
    for kind, route, table in (('list', routes[1], 'kb_lists'), ('lane', routes[2], 'kb_lanes')):
        item_id = db.execute('SELECT id FROM '+table+' WHERE board_id=? ORDER BY id', (board,)).fetchone()[0]
        db.execute('DELETE FROM kb_meta WHERE board_id=? AND kind=? AND item_id=? AND setting=?', (board, kind, item_id, 'archived'))
        db.execute('INSERT INTO kb_meta(board_id,kind,item_id,setting,value) VALUES(?,?,?,?,?)', (board, kind, item_id, 'archived', '1')); db.commit()
        assert str(item_id) not in [item['_id'] for item in call(route, token=owner)[1]]
        db.execute('DELETE FROM kb_meta WHERE board_id=? AND kind=? AND item_id=? AND setting=?', (board, kind, item_id, 'archived')); db.commit()
    for route in routes:
        assert call(route.replace('/boards/'+board, '/boards/2147483647'), token=owner)[0] == 404
    assert call('/api/boards/'+board+'/lists/2147483647/cards', token=owner) == (200, [])
    assert call('/api/boards/'+board+'/lists/2147483647/cards_count', token=owner) == (200, {'list_cards_count': 0})
subprocess.run([os.environ['GBX'], '-s', 'ApiFixture', os.environ['WEBA_TEST_PROJECT']],
    env={**os.environ, 'WEBA_TEST_MODE': 'board-read-scope', 'WEBA_API_REQUEST': '1'}, check=True)
print('Board REST reads: source role/combined/inactive boundaries, scoped global admin, list/lane/card/count fields, archives, order and missing targets passed')
