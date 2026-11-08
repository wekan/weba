"""Independent persisted inputs for the unchanged original list reduction."""
import json, os, sqlite3
from pathlib import Path
fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
board = fixture['otherBoardId']
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    lists = [{'_id': str(identity), 'modifiedAt': stamp} for identity, stamp in db.execute("SELECT l.id,m.modified_ms FROM kb_lists l LEFT JOIN kb_item_changes m ON m.board_id=l.board_id AND m.item_id=l.id AND m.kind='list' WHERE l.board_id=?", (board,))]
    cards = [{'listId': str(identity), 'modifiedAt': stamp} for identity, stamp in db.execute("SELECT l.list_id,m.modified_ms FROM kb_cards c JOIN kb_card_lists l ON l.board_id=c.board_id AND l.card_id=c.id LEFT JOIN kb_item_changes m ON m.board_id=c.board_id AND m.item_id=c.id AND m.kind='card' WHERE c.board_id=?", (board,))]
print(json.dumps({'lists': lists, 'cards': cards}))
