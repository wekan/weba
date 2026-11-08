"""Independent SQLite snapshots prove deletion cleanup commits all or nothing."""
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time

project = Path(sys.argv[1])
command = [os.environ.get('GBX', 'gbx3'), '-s', 'UserDeletionCommitTest', str(project)]
subprocess.run(command, env={**os.environ, 'WEBA_TEST_MODE': 'prepare'}, check=True)
reader = sqlite3.connect(project / 'database.db', timeout=1)
process = None
tables = ('users', 'account_sessions', 'kb_boards', 'kb_cards', 'kb_members',
          'kb_card_assignees', 'kb_removed_members', 'kb_member_flags', 'kb_user_meta', 'kb_entries', 'kb_files',
          'kb_history', 'kb_activity', 'kb_retired_authors', 'api_tokens')
def snapshot(table):
    return sorted(reader.execute('SELECT * FROM '+table).fetchall(), key=repr)
try:
    before = {table: snapshot(table) for table in tables}
    reader.execute('BEGIN')
    reader.execute('SELECT username FROM users').fetchall()
    process = subprocess.Popen(command, env={**os.environ, 'WEBA_TEST_MODE': 'delete'},
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.monotonic() + 15
    while not (project / 'deletion-failed').exists():
        if process.poll() is not None:
            raise AssertionError(process.communicate()[0])
        assert time.monotonic() < deadline, 'Deletion commit failure timed out'
        time.sleep(.02)
    reader.rollback()
    for table in tables:
        assert snapshot(table) == before[table], 'Failed deletion changed table: '+table
    (project / 'deletion-reader-released').write_text('ready')
    output, _ = process.communicate(timeout=15)
    assert process.returncode == 0, output
    target = ('delete-commit-target',)
    for table in ('users', 'account_sessions', 'api_tokens', 'kb_user_meta', 'kb_members', 'kb_removed_members', 'kb_member_flags', 'kb_card_assignees'):
        assert reader.execute('SELECT COUNT(*) FROM '+table+' WHERE username=?', target).fetchone()[0] == 0, 'Successful deletion retained a principal in '+table
    assert reader.execute('SELECT owner FROM kb_boards').fetchall() == [(None,)]
    assert reader.execute('SELECT title, description, assignee FROM kb_cards').fetchall() == [('Retained deletion card', 'Retained body', 'delete-commit-keeper')]
    assert reader.execute('SELECT body, author FROM kb_entries WHERE kind=?', ('comment',)).fetchall() == [('Retained deletion comment', None)]
    assert reader.execute('SELECT content, author FROM kb_files').fetchall() == [(b'retained\0bytes', None)]
    assert reader.execute('SELECT COUNT(*) FROM kb_entries WHERE kind=? AND done=0', ('time',)).fetchone()[0] == 0
    assert reader.execute('SELECT display_name FROM kb_retired_authors').fetchall() == [('delete-commit-target',)] * 3
    assert snapshot('kb_history') == before['kb_history'] and snapshot('kb_activity') == before['kb_activity'], 'Deletion erased history'
    assert reader.execute('SELECT username, role FROM kb_members').fetchall() == [('delete-commit-keeper', 'board-admin')]
    print(output.strip())
finally:
    reader.close()
    if process is not None and process.poll() is None:
        process.kill()
        process.communicate()
