"""Independent persisted inputs for the supported card/checklist projection."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone

fixture = json.loads(os.environ['WEBA_TEST_BOARDS'])
card_id, board = fixture['otherCardId'], fixture['otherBoardId']
card = json.loads(subprocess.check_output([sys.executable, str(Path(__file__).with_name('wekan-members-oracle.py')), 'card', str(card_id)], text=True))
def iso(stamp):
    seconds, millis = divmod(stamp, 1000)
    return datetime.fromtimestamp(seconds, timezone.utc).replace(microsecond=millis*1000).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST']) / os.environ['WEBA_DB_NAME']) as db:
    title, description, lane = db.execute('SELECT title,description,lane FROM kb_cards WHERE id=?', (card_id,)).fetchone()
    card.update(title=title, description=description or '')
    card['swimlaneId'] = str(db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?', (board, lane)).fetchone()[0])
    rank = db.execute("SELECT sort_order FROM kb_order WHERE board_id=? AND kind='card' AND item=?", (board, str(card_id))).fetchone()
    card['sort'] = rank[0] if rank else card_id
    changed = db.execute("SELECT modified_ms FROM kb_item_changes WHERE board_id=? AND kind='card' AND item_id=?", (board, card_id)).fetchone()
    if changed:
        card['modifiedAt'] = iso(changed[0])
    archived = db.execute('SELECT archived_ms FROM kb_card_archive WHERE board_id=? AND card_id=?', (board, card_id)).fetchone()
    if archived:
        card['archivedAt'] = iso(archived[0])
    checklists, items = [], []
    for identity, title, created_at in db.execute("SELECT id,title,created_at FROM kb_entries WHERE board_id=? AND card_id=? AND kind='checklist' ORDER BY id", (board, card_id)):
        row = {'_id': str(identity), 'boardId': str(board), 'cardId': str(card_id), 'title': title or '', 'sort': identity}
        if created_at:
            # Gambas's SQLite driver writes local civil time and reads it back
            # into a UTC-backed Date. Match the process's actual local timezone.
            row['createdAt'] = datetime.fromisoformat(created_at).astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        checklists.append(row)
        for item_id, text, done in db.execute("SELECT id,title,done FROM kb_entries WHERE board_id=? AND card_id=? AND parent_id=? AND kind='checkitem' ORDER BY id", (board, card_id, identity)):
            items.append({'_id': str(item_id), 'cardId': str(card_id), 'checklistId': str(identity), 'title': text or '', 'isFinished': bool(done), 'sort': item_id})
print(json.dumps({'card': card, 'checklists': checklists, 'items': items}))
