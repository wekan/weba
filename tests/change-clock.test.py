"""Verify the real Gambas clock against system UTC in several time zones."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='weba-change-clock-', dir=os.environ['TMPDIR']) as work:
    project = Path(work)
    for name in ('.src', '.public'):
        shutil.copytree(root/'WeKan'/name, project/name)
    shutil.copy2(root/'WeKan/.project', project/'.project')
    shutil.copy2(root/'tests/ChangeClock.module', project/'.src/ChangeClock.module')
    subprocess.run([os.environ['GBC'], '-j', '1', '-a', str(project)], check=True)
    for zone in ('UTC', 'Europe/Helsinki', 'America/New_York', 'Asia/Kathmandu'):
        start = time.time_ns() // 1000000
        stamp = int(subprocess.check_output([os.environ['GBX'], '-s', 'ChangeClock', str(project)], env={**os.environ, 'TZ': zone}, text=True))
        end = time.time_ns() // 1000000
        assert start-2 <= stamp <= end+2, (zone, stamp, start, end)
print('Change clock: UTC millisecond epochs verified in UTC, Helsinki, New York and Kathmandu')
