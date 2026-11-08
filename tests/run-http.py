"""Real Gambas CGI/session test, using the packaged runtime host and a fresh DB."""
from http.server import ThreadingHTTPServer
from pathlib import Path
import os, shutil, subprocess, sys, tempfile, threading, secrets, urllib.request, urllib.error, json

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
    (project / 'private-canary.txt').write_text('private-fixture-canary-must-not-be-served')
    (project / '.public/public-canary.txt').write_text('public-fixture-canary')
    if any(mode in sys.argv for mode in ('--api', '--sessions', '--members')):
        shutil.copy2(root / 'tests/ApiFixture.module', project / '.src/ApiFixture.module')
    if '--members' in sys.argv:
        shutil.copy2(root / 'tests/CardDatesConformance.module', project / '.src/CardDatesConformance.module')
    subprocess.run([base_env.get('GBC', 'gbc3'), '-j', '1', '-a', str(project)], check=True, env=base_env)
    application = project
    runner = base_env.get('GBX', 'gbx3')
    if '--archive' in sys.argv:
        application = Path(work) / 'weba.gambas'
        subprocess.run([base_env.get('GBA', 'gba3'), '-o', str(application), str(project)], check=True, env=base_env)
        runner = base_env.get('GBR', 'gbr3')
    base_env.update(WEBA_DB_TYPE='sqlite3', WEBA_DB_HOST=str(project), WEBA_DB_NAME='database.db', WEBA_DB_USER='', WEBA_DB_PASSWORD='')
    if any(mode in sys.argv for mode in ('--api', '--sessions', '--members')):
        base_env.update(WITH_API='true', WEBA_TEST_FIXTURE='1', WEBA_TEST_PASSWORD=secrets.token_urlsafe(24), WEBA_TEST_MEMBERS='1' if '--members' in sys.argv else '0')
        fixture = subprocess.run([base_env.get('GBX', 'gbx3'), '-s', 'ApiFixture', str(project)],
                                 env=base_env, capture_output=True, text=True)
        if fixture.returncode:
            raise AssertionError((fixture.stdout + fixture.stderr).replace(base_env['WEBA_TEST_PASSWORD'], '[redacted]'))
        base_env['WEBA_TEST_BOARDS'] = fixture.stdout.strip()
        base_env['WEBA_TEST_PROJECT'] = str(project)
    if any(mode in sys.argv for mode in ('--api', '--sessions', '--members')):
        disabled_env = base_env.copy()
        disabled_env['WITH_API'] = 'false'
        with ThreadingHTTPServer(('127.0.0.1', 0), handler(application, runner, disabled_env)) as disabled:
            disabled_thread = threading.Thread(target=disabled.serve_forever, daemon=True)
            disabled_thread.start()
            try:
                for route in ['/api/users/rest-owner/boards', '/%61pi/users/rest-owner/boards', '/API/users/rest-owner/boards']:
                    try:
                        urllib.request.urlopen('http://127.0.0.1:' + str(disabled.server_port) + route, timeout=10)
                    except urllib.error.HTTPError as error:
                        assert error.code == 403
                        assert 'API is disabled' in json.loads(error.read())['error']
                    else:
                        raise AssertionError('WITH_API=false was bypassed')
            finally:
                disabled.shutdown()
                disabled_thread.join(timeout=5)
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler(application, runner, base_env))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        env = base_env.copy()
        env['WEBA_TEST_URL'] = 'http://127.0.0.1:' + str(server.server_port)
        env['WEBA_TEST_RUNNER'] = runner
        env['WEBA_TEST_APPLICATION'] = str(application)
        if '--members' in sys.argv:
            subprocess.run([env.get('NODE', 'node'), str(root / 'tests/dates-conformance.test.cjs')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-members.test.py')], check=True, env=env)
            subprocess.run([env.get('NODE', 'node'), str(root / 'tests/wekan-members.test.cjs')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-card-people.test.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-people-put.test.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-dates.test.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-description.test.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/card-people-commit.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/member-commit.py')], check=True, env=env)
        elif '--sessions' in sys.argv:
            subprocess.run([sys.executable, str(root / 'tests/sessions.test.py')], check=True, env=env)
        elif '--api' in sys.argv:
            subprocess.run([env.get('NODE', 'node'), str(root / 'tests/wekan-users.test.cjs')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api-user-delete.test.py')], check=True, env=env)
            subprocess.run([sys.executable, str(root / 'tests/api.test.py')], check=True, env=env)
        elif '--browser' in sys.argv:
            subprocess.run([env.get('NODE', 'node'), str(root / 'tests/layout.browser.cjs')], check=True, env=env)
        else:
            subprocess.run([sys.executable, str(root / 'tests/http.test.py')], check=True, env=env)
    finally:
        server.shutdown()
        server.server_close()
