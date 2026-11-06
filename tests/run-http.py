"""Real Gambas CGI/session test, using the packaged runtime host and a fresh DB."""
from http.server import ThreadingHTTPServer
from pathlib import Path
import os, shutil, subprocess, sys, tempfile, threading

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'runtime'))
from server import handler

base_env = os.environ.copy()
base_env['PATH'] = str(Path(shutil.which(base_env.get('GBX', 'gbx3'))).parent) + os.pathsep + base_env['PATH']
with tempfile.TemporaryDirectory(prefix='weba-http.', dir=os.environ['TMPDIR']) as work:
    project = Path(work) / 'project'
    project.mkdir()
    for name in ['.src', '.public']: shutil.copytree(root / 'WeKan' / name, project / name)
    shutil.copy2(root / 'WeKan/.project', project / '.project')
    subprocess.run([base_env.get('GBC', 'gbc3'), '-j', '1', '-a', str(project)], check=True, env=base_env)
    application = project
    runner = base_env.get('GBX', 'gbx3')
    if '--archive' in sys.argv:
        application = Path(work) / 'weba.gambas'
        subprocess.run([base_env.get('GBA', 'gba3'), '-o', str(application), str(project)], check=True, env=base_env)
        runner = base_env.get('GBR', 'gbr3')
    base_env.update(WEBA_DB_TYPE='sqlite3', WEBA_DB_HOST=str(project), WEBA_DB_NAME='database.db', WEBA_DB_USER='', WEBA_DB_PASSWORD='')
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler(application, runner, base_env))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        env = base_env.copy()
        env['WEBA_TEST_URL'] = 'http://127.0.0.1:' + str(server.server_port)
        if '--browser' in sys.argv:
            subprocess.run([env.get('NODE', 'node'), str(root / 'tests/layout.browser.cjs')], check=True, env=env)
        else:
            subprocess.run([sys.executable, str(root / 'tests/http.test.py')], check=True, env=env)
    finally:
        server.shutdown()
        server.server_close()
