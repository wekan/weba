"""Actual GitHub/Gitea/Forgejo export HTTP, field selections and final guards."""
import hashlib,json,os,sqlite3,subprocess,traceback,urllib.error,urllib.parse,urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL'];secrets=[os.environ['WEBA_TEST_PASSWORD']];last=None;cases=[];role_cases=[]
def call(route,method='GET',token=None):
    global last
    request=urllib.request.Request(base+route,method=method,headers={'Authorization':'Bearer '+token} if token else {})
    try: response=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as error: response=error
    with response:
        body=response.read();data=json.loads(body) if response.headers.get('Content-Type','').startswith('application/json') else body.decode()
        last=(urllib.parse.urlsplit(route).path,response.status,data)
        return response.status,data,dict(response.headers)
def pair(*args,**kwargs):return call(*args,**kwargs)[:2]
def login(name):
    req=urllib.request.Request(base+'/users/login',method='POST',headers={'Content-Type':'application/json'},data=json.dumps({'username':name,'password':os.environ['WEBA_TEST_PASSWORD']}).encode())
    with urllib.request.urlopen(req) as response:token=json.load(response)['token']
    secrets.append(token);return token
def fixture(name,extra={}):return json.loads(subprocess.check_output([os.environ['GBX'],'-s',name,os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0',**extra}))
def main():
    f=fixture('AttachmentFixture');board=f['boardId'];owner,member,reader,assigned,admin=(login(name) for name in ['rest-other','rest-member','rest-file-reader','rest-file-assigned','rest-owner'])
    fixture('ImportExportPolicyFixture',{'WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":false}'})
    seeded=fixture('IssueApiFixture',{'WEBA_ISSUE_BOARD':str(board),'WEBA_ISSUE_PERMISSION':'private','WEBA_ISSUE_SEED':'1','WEBA_ISSUE_CARD':str(f['cardId'])})
    with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
        db.execute('UPDATE kb_cards SET description=?,labels=?,due_day=? WHERE id=?',('<literal> Ω\nquote "', 'one,one, Ω','2026-11-14',f['cardId']))
        db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND title=?',('incomplete',board,'Todo'));db.commit()
        items=[{'title':'Retained attachments','description':'<literal> Ω\nquote "','listTitle':'incomplete','labels':['one','one','Ω'],'dueAt':'2026-11-14T00:00:00.000Z','endAt':'2026-11-13T01:02:03.004Z','owner':'rest-file-assigned','assignees':['rest-member','rest-file-assigned'],'comments':seeded['comments']}, {'title':'Unassigned attachments','description':'','listTitle':'incomplete','labels':[]}]
        def snapshot():
            names=[row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'kb_%' OR name IN ('api_tokens','import_export_settings','users'))")]
            return {name:sorted(db.execute('SELECT * FROM '+name).fetchall(),key=repr) for name in names}
        for fmt in ['github','gitea','forgejo','gitlab']:
            url=f'/api/boards/{board}/export/{fmt}'
            status,data,headers=call(url,token=owner);assert status==200,(status,data)
            assert headers['Cache-Control']=='no-store' and headers['X-Content-Type-Options']=='nosniff'
            before=snapshot()
            for fields in [None,'','unknown','labels','dates','description','people','labels,dates','labels,description','dates,description','labels,dates,description','\u00a0labels\ufeff, unknown','board-header','sort,scrum','Labels','comments','people,comments','dates,comments','description,people,comments','labels,dates,people,comments']:
                query='' if fields is None else '?fields='+urllib.parse.quote(fields)
                status,data=pair(url+query,token=reader);assert status==200,(status,data)
                assert 'API_HIDDEN_' not in json.dumps(data) and 'API_ARCHIVED_' not in json.dumps(data)
                cases.append({'format':fmt,'fields':fields,'items':items,'actual':data})
            for query in ['?fields=labels&fields=dates','?fields[0]=labels','?fields=labels&fields[x]=dates']:
                status,data=pair(url+query,token=owner);assert status==200
                cases.append({'format':fmt,'fields':['labels','dates'],'items':items,'actual':data})
            for token in [owner,member,reader]:
                assert pair(url,token=token)[0]==200
                assert pair(url+'?authToken='+token)[0]==200
                assert pair(url+'/?authToken='+token)[0]==200
            assert pair(url)==(403,{'error':'Forbidden'})
            assert pair(url+'?authToken=bad',token=owner)==(401,{'error':'Invalid token'})
            assert pair(url+'?authToken='+owner,token='bad')[0]==200
            assert pair(url+'?authToken='+owner+'&authToken='+owner)==(400,{'error':'Bad request'})
            assert pair(url+'?authToken='+('x'*10001))==(400,{'error':'Bad request'})
            for token in [assigned,admin]:assert pair(url,token=token)==(403,{'error':'Forbidden'})
            assert pair(url,method='POST',token=owner)==(405,{'error':'Method not allowed'})
            assert pair(f'/api/boards/99999999/export/{fmt}?authToken=bad')==(404,{'error':'Not found'})
            assert pair(f'/api/boards/0{board}/export/{fmt}',token=owner)==(404,{'error':'Not found'})
            assert snapshot()==before
            if fmt=='gitlab':
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND title=?',('Doing',board,'incomplete'));db.commit()
                status,data=pair(url,token=owner);assert status==200
                assert all(row['state']=='opened' and 'closed_at' not in row for row in data)
                cases.append({'format':fmt,'fields':None,'items':[{**item,'listTitle':'Doing'} for item in items],'actual':data})
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND title=?',('incomplete',board,'Doing'));db.commit()
        url=f'/api/boards/{board}/export/github'
        role_flags=[entry['flag'] for entry in json.loads((Path(__file__).parent.parent/'WeKan/.public/api-member-roles.json').read_text())['roles'] if entry.get('flag')]
        assert len(role_flags)==8
        for mask in range(256):
            flags={flag:bool(mask&(1<<index)) for index,flag in enumerate(role_flags)}
            db.execute('DELETE FROM kb_member_flags WHERE board_id=? AND username=?',(board,'rest-file-reader'))
            for flag,value in flags.items():
                if value:db.execute('INSERT INTO kb_member_flags(board_id,username,flag) VALUES(?,?,?)',(board,'rest-file-reader',flag))
            db.commit();before=snapshot();status,data=pair(url,token=reader)
            expected=403 if any(flags.get(flag) for flag in ['isNormalAssignedOnly','isCommentAssignedOnly','isReadAssignedOnly']) else 200
            assert status==expected,(mask,status,data);assert snapshot()==before
            role_cases.append({'flags':flags,'status':status})
        db.execute('DELETE FROM kb_member_flags WHERE board_id=? AND username=?',(board,'rest-file-reader'));db.commit()
        db.execute(f"CREATE TRIGGER issue_role AFTER UPDATE OF title ON kb_boards WHEN NEW.id={board} BEGIN UPDATE kb_members SET role='normal-assigned-only' WHERE board_id={board} AND username='rest-file-reader'; END");db.commit();before=snapshot()
        assert pair(url,token=reader)==(403,{'error':'Forbidden'});assert snapshot()==before
        db.execute('DROP TRIGGER issue_role');db.commit()
        # Final token and export policy checks roll back injected mutations.
        digest=hashlib.sha256(owner.encode()).hexdigest()
        for effect,expected in [(f"DELETE FROM api_tokens WHERE digest='{digest}'",(401,{'error':'Invalid token'})),('UPDATE import_export_settings SET disable_export=1 WHERE id=1',(403,'Export is disabled by the administrator.'))]:
            db.execute(f'CREATE TRIGGER issue_late AFTER UPDATE OF title ON kb_boards WHEN NEW.id={board} BEGIN {effect}; END');db.commit();before=snapshot()
            assert pair(url,token=owner)==expected;assert snapshot()==before
            db.execute('DROP TRIGGER issue_late');db.commit();assert pair(url,token=owner)[0]==200
        db.execute('UPDATE kb_boards SET archived=1 WHERE id=?',(board,));db.commit();assert pair(url,token=owner)[0]==200
        db.execute('UPDATE kb_boards SET archived=0 WHERE id=?',(board,));db.commit()
        fixture('IssueApiFixture',{'WEBA_ISSUE_BOARD':str(board),'WEBA_ISSUE_PERMISSION':'public'})
        before=snapshot()
        for suffix in ['', '?authToken=bad','?authToken='+('x'*10001),'?authToken=a&authToken=b']:
            status,data=pair(url+suffix);assert status==200,(status,data)
            cases.append({'format':'github','fields':None,'items':items,'actual':data})
        assert pair(url,token=assigned)[0]==200
        gitlab_url=f'/api/boards/{board}/export/gitlab'
        status,data=pair(gitlab_url+'?fields=comments&authToken=bad');assert status==200
        cases.append({'format':'gitlab','fields':'comments','items':items,'actual':data})
        status,data=pair(gitlab_url+'?authToken=bad');assert status==200
        cases.append({'format':'gitlab','fields':None,'items':items,'actual':data})
        assert snapshot()==before
        db.execute(f"CREATE TRIGGER issue_public AFTER UPDATE OF title ON kb_boards WHEN NEW.id={board} BEGIN UPDATE kb_board_visibility SET permission='private' WHERE board_id={board}; END");db.commit();before=snapshot()
        assert pair(url)==(403,{'error':'Forbidden'});assert snapshot()==before
        db.execute('DROP TRIGGER issue_public');db.commit()
        fixture('ImportExportPolicyFixture',{'WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":true}'})
        assert pair('/api/boards/99999999/export/github?authToken=bad')==(403,'Export is disabled by the administrator.')
        db.execute('ALTER TABLE kb_boards RENAME COLUMN id TO issue_hidden_id');db.commit();before=snapshot()
        assert pair(url+'?authToken=bad')==(403,'Export is disabled by the administrator.');assert snapshot()==before
        db.execute('ALTER TABLE kb_boards RENAME COLUMN issue_hidden_id TO id');db.commit()
        fixture('ImportExportPolicyFixture',{'WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":false}'})
        db.execute('ALTER TABLE kb_cards RENAME COLUMN labels TO opaque_export_canary');db.commit();before=snapshot()
        assert pair(url)==(500,{'error':'Board export failed'});assert snapshot()==before
        db.execute('ALTER TABLE kb_cards RENAME COLUMN opaque_export_canary TO labels');db.commit()
    Path(os.environ['WEBA_TEST_PROJECT'],'issue-export-cases.json').write_text(json.dumps(cases))
    Path(os.environ['WEBA_TEST_PROJECT'],'issue-export-roles.json').write_text(json.dumps(role_cases))
    print('Issue export HTTP: four source routes, public/private/query-bearer auth precedence, field selections, archive reads, no writes, assigned-only/global-admin denial, all 256 raw role sets, late member/token/policy/public rollback and opaque failure passed')
try:main()
except Exception as error:
    message=traceback.format_exc()+"\nLast response: "+repr(last)
    for secret in secrets:message=message.replace(secret,'[redacted]')
    raise SystemExit(message) from None
