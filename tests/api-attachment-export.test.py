"""Actual source-shaped single-attachment export and fresh policy/auth/scope."""
import base64,hashlib,json,os,sqlite3,subprocess,traceback,urllib.error,urllib.parse,urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
secrets=[os.environ['WEBA_TEST_PASSWORD']]
last=None
def call(route,method='GET',token=None,data=None):
    global last
    request=urllib.request.Request(base+route,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},data=json.dumps(data).encode() if data is not None else None)
    try:response=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as error:response=error
    with response:
        body=response.read();kind=response.headers.get('Content-Type','')
        parsed=json.loads(body) if kind.startswith('application/json') else body.decode()
        last=(urllib.parse.urlsplit(route).path,response.status,parsed)
        return response.status,parsed,dict(response.headers)
def pair(*args,**kwargs):return call(*args,**kwargs)[:2]
def login(name):
    status,data=pair('/users/login','POST',data={'username':name,'password':os.environ['WEBA_TEST_PASSWORD']});assert status==200
    secrets.append(data['token']);return data['token']
def seed():return json.loads(subprocess.check_output([os.environ['GBX'],'-s','AttachmentFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0'}))
def route(board,file):return f'/api/boards/{board}/attachments/{file}/export'
def main():
    f=seed();foreign=seed();owner,admin,member,reader,assigned=(login(n) for n in ['rest-other','rest-owner','rest-member','rest-file-reader','rest-file-assigned'])
    board,file=str(f['boardId']),str(f['fileId']);url=route(board,file)
    # Initialize policy through the fixture so every no-write frame is stable.
    subprocess.check_output([os.environ['GBX'],'-s','ImportExportPolicyFixture',os.environ['WEBA_TEST_PROJECT']],env={**os.environ,'WEBA_API_REQUEST':'0','WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":false}'})
    with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
        name='Résumé + <literal> 🚀.html';binary=bytes(range(256))+b'\x00\xff\r\nbytes'
        db.execute('UPDATE kb_files SET filename=?,content=? WHERE id=?',(name,binary,f['fileId']));db.execute('UPDATE kb_attachment_data SET mime=? WHERE file_id=?',('text/html',f['fileId']));db.commit()
        expected={'_id':file,'cardId':str(f['cardId']),'name':name,'type':'text/html','file':base64.b64encode(binary).decode()}
        def snapshot():
            names=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'kb_%' OR name IN ('api_tokens','import_export_settings','users'))")]
            return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for t in names}
        before=snapshot()
        status,document,headers=call(url,token=owner)
        assert (status,document)==(200,expected)
        assert headers['Cache-Control']=='no-store' and headers['X-Content-Type-Options']=='nosniff'
        assert headers['Content-Type'].startswith('application/json')
        assert pair(url)==(403,{'error':'Forbidden'})
        assert pair(url+'?authToken=invalid')==(401,{'error':'Invalid token'})
        assert pair(route('99999999',file)+'?authToken=invalid')==(404,{'error':'Not found'})
        assert pair(route('0'+board,file),token=owner)==(404,{'error':'Not found'})
        for token in [owner,member,reader]:
            assert pair(url,token=token)==(200,expected)
            assert pair(url+'?authToken='+urllib.parse.quote(token))==(200,expected)
        assert pair(url+'?%61uthToken='+owner)==(200,expected)
        assert pair(url+'?authToken=',token=owner)==(200,expected)
        assert pair(url+'?authToken=invalid',token=owner)==(401,{'error':'Invalid token'})
        assert pair(url+'?authToken='+owner+'&authToken='+owner)==(400,{'error':'Bad request'})
        for key in ['authToken[]','authToken[x]','%61uthToken%5B%5D']:
            assert pair(url+'?'+key+'='+owner,token=owner)==(400,{'error':'Bad request'})
        assert pair(url+'?authToken='+'x'*10001)==(400,{'error':'Bad request'})
        assert pair(route('99999999',file)+'?authToken='+'x'*10001)==(404,{'error':'Not found'})
        assert pair('/api/attachment/info/'+file+'?authToken='+owner)[0]==401
        for token in [assigned,admin]:assert pair(url,token=token)==(403,{'error':'Forbidden'})
        for ref in ['missing','99999999','0'+file,str(foreign['fileId'])]:assert pair(route(board,ref),token=owner)==(200,{})
        assert snapshot()==before
        # The source route finds an absent board before consulting login tokens.
        db.execute('ALTER TABLE api_tokens RENAME TO export_token_canary');db.commit()
        assert pair(route('99999999',file)+'?authToken='+owner)==(404,{'error':'Not found'})
        db.execute('ALTER TABLE export_token_canary RENAME TO api_tokens');db.commit()
        # Combined raw assignment narrows even a board administrator.
        db.execute("UPDATE kb_members SET role='board-admin' WHERE board_id=? AND username='rest-file-reader'",(f['boardId'],));db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isReadAssignedOnly')",(f['boardId'],'rest-file-reader'));db.commit()
        assert pair(url,token=reader)==(403,{'error':'Forbidden'})
        db.execute("DELETE FROM kb_member_flags WHERE board_id=? AND username='rest-file-reader'",(f['boardId'],));db.commit()
        assert pair(url,token=reader)==(200,expected)
        # Soft-deleted exports disappear; the separate retained read API remains.
        assert pair('/api/attachment/delete/'+file,'DELETE',owner)[0]==200
        assert pair(url,token=owner)==(200,{})
        assert pair('/api/attachment/download/'+file,token=owner)[0]==200
        # Use the other live file for limits, legacy and late-check probes.
        live=str(f['otherId']);live_url=route(board,live)
        db.execute('DELETE FROM kb_attachment_data WHERE file_id=?',(f['otherId'],));db.execute('UPDATE kb_files SET content=? WHERE id=?',(b'',f['otherId']));db.commit()
        assert pair(live_url,token=owner)==(200,{'_id':live,'cardId':str(db.execute('SELECT card_id FROM kb_files WHERE id=?',(f['otherId'],)).fetchone()[0]),'name':'private.bin','type':'application/octet-stream','file':''})
        db.execute('UPDATE kb_files SET content=? WHERE id=?',(b'x'*513,f['otherId']));db.commit()
        assert pair(live_url,token=owner)==(413,{'error':'Attachment exceeds API download limit'})
        db.execute('UPDATE kb_files SET content=? WHERE id=?',(b'live',f['otherId']));db.commit()
        # Disable is first, independent of private-board existence or credentials.
        db.execute('UPDATE import_export_settings SET disable_export=1 WHERE id=1');db.commit();before=snapshot()
        for target in [live_url,route('99999999',file)+'?authToken=invalid',url+'?authToken='+'x'*10001]:
            status,body,headers=call(target,token=owner);assert (status,body)==(403,'Export is disabled by the administrator.');assert headers['Content-Type'].startswith('text/plain');assert headers['Cache-Control']=='no-store'
        assert snapshot()==before
        db.execute('UPDATE import_export_settings SET disable_export=0 WHERE id=1');db.commit()
        before=snapshot();db.execute("CREATE TRIGGER export_late_policy AFTER UPDATE OF id ON import_export_settings BEGIN UPDATE import_export_settings SET disable_export=1 WHERE id=1; END");db.commit()
        assert pair(live_url,token=owner)==(403,'Export is disabled by the administrator.');assert snapshot()==before
        db.execute('DROP TRIGGER export_late_policy');db.commit()
        before=snapshot();db.execute("CREATE TRIGGER export_late_token AFTER UPDATE OF title ON kb_boards BEGIN DELETE FROM api_tokens WHERE username='rest-other'; END");db.commit()
        assert pair(live_url,token=owner)==(401,{'error':'Invalid token'});assert snapshot()==before
        db.execute('DROP TRIGGER export_late_token');db.commit()
        assert pair(live_url,token=owner)[0]==200
        db.execute('ALTER TABLE kb_attachment_data RENAME COLUMN mime TO private_export_canary');db.commit();before=snapshot()
        # Target a live file with a metadata row to exercise the serializer failure.
        assert pair(route(foreign['boardId'],foreign['fileId']),token=owner)==(500,{'error':'Attachment export failed'});assert snapshot()==before
        db.execute('ALTER TABLE kb_attachment_data RENAME COLUMN private_export_canary TO mime');db.commit()
        db.execute('UPDATE api_tokens SET expires_at=? WHERE digest=?',('2000-01-01',hashlib.sha256(reader.encode()).hexdigest()));db.commit()
        assert pair(live_url+'?authToken='+reader)==(401,{'error':'Invalid token'})
    print('Attachment export HTTP: exact source-shaped Unicode/binary JSON, scoped query/bearer credentials and precedence, disabled/missing/auth order, assignment/admin/foreign/deleted guards, legacy/size policy, late policy/token rollback and opaque SQL failure passed')
try:main()
except Exception as error:
    message=traceback.format_exc()+"\nLast response: "+repr(last)
    for secret in secrets:message=message.replace(secret,'[redacted]')
    raise SystemExit(message) from None
