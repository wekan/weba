"""Explicit SQLite fixture adapter for unchanged WeKan archive assertions."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys

operation = sys.argv[1]
args = [json.loads(arg) for arg in sys.argv[2:]]
if operation == 'seed':
    output = subprocess.check_output([os.environ['GBX'], '-s', 'ArchiveFixture', os.environ['WEBA_TEST_PROJECT']],
        env={**os.environ, 'WEBA_API_REQUEST': '0', 'WEBA_TEST_USER': args[0]['ownerId']}, text=True)
    print(output.strip())
    sys.exit()
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    db.row_factory = sqlite3.Row
    tables = [row['name'] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
    def rows(table, where, params):
        return [dict(row) for row in db.execute('SELECT * FROM '+table+' WHERE '+where+' ORDER BY rowid', params)]
    def card_document(query):
        if '_id' in query:
            cards = rows('kb_cards', 'id=?', (query['_id'],))
        else:
            assert set(query) == {'boardId', 'title'}, query
            cards = rows('kb_cards', 'board_id=? AND title=?', (query['boardId'], query['title']))
        assert len(cards) == 1, query
        card = cards[0]
        links = rows('kb_card_lists', 'board_id=? AND card_id=?', (card['board_id'], card['id']))
        assert len(links) == 1
        card.update(_id=str(card['id']), boardId=str(card['board_id']), listId=str(links[0]['list_id']), archived=bool(card['archived']))
        # Compare every card-scoped native metadata row as well as the card itself.
        related = {}
        for table in tables:
            columns = {row['name'] for row in db.execute('PRAGMA table_info('+table+')')}
            if 'card_id' in columns:
                related[table] = rows(table, 'card_id=?', (card['id'],))
        related['kb_item_changes'] = rows('kb_item_changes', 'kind=? AND item_id=?', ('card', card['id']))
        card['_nativeMetadata'] = related
        return card
    result = None
    if operation == 'prepare':
        fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
        card = db.execute('SELECT title,archived FROM kb_cards WHERE id=?', (fixture['otherCardId'],)).fetchone()
        result = {'cardId': fixture['otherCardId'], 'title': card['title'], 'archived': card['archived'],
                  'boardId': str(fixture['otherBoardId']),
                  'listIds': [str(row['id']) for row in db.execute('SELECT id FROM kb_lists WHERE board_id=? ORDER BY id', (fixture['otherBoardId'],))]}
        assert len(result['listIds']) >= 2
        db.execute('UPDATE kb_cards SET title=? WHERE id=?', ('Alpha Card', fixture['otherCardId']))
    elif operation == 'restore':
        saved = args[0]
        db.execute('UPDATE kb_cards SET title=?,archived=? WHERE id=?', (saved['title'], saved['archived'], saved['cardId']))
    elif operation == 'find-one':
        assert args[0] == 'cards'
        result = card_document(args[1])
    elif operation == 'find':
        assert args[0] == 'activities' and set(args[1]) == {'cardId'}
        result = rows('kb_history', 'kind=? AND item_id=?', ('card', args[1]['cardId']))
    elif operation == 'update':
        collection, query, update = args
        assert collection == 'cards' and set(query) == {'_id'} and set(update) == {'$set'} and set(update['$set']) == {'archived'}
        assert isinstance(update['$set']['archived'], bool)
        db.execute('UPDATE kb_cards SET archived=? WHERE id=?', (update['$set']['archived'], query['_id']))
    elif operation == 'cleanup':
        assert set(args[0]) == {'boardIds'}
        for board in args[0]['boardIds']:
            assert db.execute('SELECT title FROM kb_boards WHERE id=?', (board,)).fetchone()['title'] == 'Original archive spec temporary board'
            for table in tables:
                columns = {row['name'] for row in db.execute('PRAGMA table_info('+table+')')}
                if 'board_id' in columns:
                    db.execute('DELETE FROM '+table+' WHERE board_id=?', (board,))
            db.execute('DELETE FROM kb_boards WHERE id=?', (board,))
    else:
        raise AssertionError(operation)
    db.commit()
    print(json.dumps(result))
