"""Force a real failed SQLite COMMIT; application code remains driver portable."""
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time

project = Path(sys.argv[1])
command = [os.environ.get('GBX', 'gbx3'), '-s', 'RegistrationCommitTest', str(project)]
subprocess.run(command, env={**os.environ, 'WEBA_TEST_MODE': 'prepare'}, check=True)
reader = sqlite3.connect(project / 'database.db', timeout=1)
process = None
try:
    reader.execute('BEGIN')
    reader.execute('SELECT username FROM users').fetchall()
    process = subprocess.Popen(command, env={**os.environ, 'WEBA_TEST_MODE': 'register'},
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    def wait_for(name):
        deadline = time.monotonic() + 15
        while not (project / name).exists():
            if process.poll() is not None:
                raise AssertionError(process.communicate()[0] or 'Commit fixture exited before ' + name)
            assert time.monotonic() < deadline, 'Commit synchronization timed out: ' + name
            time.sleep(.02)

    wait_for('commit-failed')
    assert reader.execute('SELECT COUNT(*) FROM users').fetchone()[0] == 0, 'Uncommitted account escaped its transaction'
    reader.rollback()
    (project / 'reader-released').write_text('ready')
    wait_for('card-ready')
    reader.execute('BEGIN')
    before = reader.execute('SELECT title, description FROM kb_cards').fetchall()
    assert before == [('Before commit failure', 'Unchanged body')]
    history_before = reader.execute('SELECT COUNT(*) FROM kb_history').fetchone()[0]
    (project / 'card-reader-held').write_text('ready')
    wait_for('card-commit-failed')
    assert reader.execute('SELECT title, description FROM kb_cards').fetchall() == before
    reader.rollback()
    assert reader.execute('SELECT COUNT(*) FROM kb_history').fetchone()[0] == history_before, 'Failed commit leaked an activity'
    (project / 'card-reader-released').write_text('ready')
    output, _ = process.communicate(timeout=15)
    assert process.returncode == 0, output
    print(output.strip())
    accounts = reader.execute('SELECT username, admin FROM users').fetchall()
    assert len(accounts) == 1 and accounts[0][0] == 'commit-retry' and accounts[0][1] in (1, -1), 'Recovery must create exactly one Admin'
    assert reader.execute('SELECT COUNT(*) FROM account_bootstrap').fetchone()[0] == 1
    assert reader.execute('SELECT title, description FROM kb_cards').fetchall() == [('Recovered card', 'Unchanged body')]
    assert reader.execute('SELECT COUNT(*) FROM kb_history').fetchone()[0] == history_before + 1
finally:
    reader.close()
    if process is not None and process.poll() is None:
        process.kill()
        process.communicate()
