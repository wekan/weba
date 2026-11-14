"""Actual raw/JSON upload contract and fresh authorization/rollback."""
import base64,json,os,sqlite3,subprocess,urllib.error,urllib.parse,urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
def call(route,body=None,token=None,mime='application/json',method='POST'):
    request=urllib.request.Request(base+route,method=method,headers={'Content-Type':mime,**({'Authorization':'Bearer '+token} if token else {})},data=body)
    try: response=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as error: response=error
    with response:
        assert response.headers.get_content_type()=='application/json'
        return response.status,json.loads(response.read())
def login(name):
    status,data=call('/users/login',json.dumps({'username':name,'password':os.environ['WEBA_TEST_PASSWORD']}).encode());assert status==200
    return data['token']
f=json.loads(subprocess.check_output([os.environ['GBX'],'-s','AttachmentFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0'}))
owner,admin,member,reader,assigned=(login(n) for n in ('rest-other','rest-owner','rest-member','rest-file-reader','rest-file-assigned'))
target={k:str(f[k]) for k in ('boardId','swimlaneId','listId','cardId')};binary=bytes(range(256))+b'\x00\xffutf8-\xe2\x98\x83'
def upload(token=owner,raw=False,content=binary,**extra):
    data={**target,'fileName':'literal <upload>.bin','fileType':'application/x-weba-test',**extra}
    if raw:return call('/api/attachment/upload?'+urllib.parse.urlencode(data),content,token,'application/octet-stream')
    data['fileData']=base64.b64encode(content).decode()
    return call('/api/attachment/upload',json.dumps(data).encode(),token)
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
    def snapshot():return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for t in tables}
    before=snapshot();assert upload(token=None)[0]==401
    for raw in (False,True):
        for token in (reader,):assert upload(token=token,raw=raw)[0]==403;assert snapshot()==before
        assert upload(token=assigned,raw=raw,cardId=str(f['cardId']+1))[0]==403;assert snapshot()==before
        for extra,status,message in [({'boardId':'999999'},404,'Board not found'),({'swimlaneId':'999999'},400,"Swimlane ID does not match the card's swimlane"),({'listId':'999999'},400,"List ID does not match the card's list"),({'cardId':'999999'},404,'Card not found')]:
            assert upload(raw=raw,**extra)==(status,{'success':False,'error':message});assert snapshot()==before
        assert upload(raw=raw,content=b'x'*1025)[0]==413;assert snapshot()==before
        assert upload(raw=raw,fileType='text/plain\r\nInjected: yes')[0]==400;assert snapshot()==before
    assert call('/api/attachment/upload',b'{',owner)[0]==400
    assert call('/api/attachment/upload',b'[]',owner)[0]==400
    assert call('/api/attachment/upload',json.dumps({**target,'fileName':'x','fileData':12}).encode(),owner)==(400,{'success':False,'error':'Invalid fileData format'})
    assert snapshot()==before
    db.execute("CREATE TRIGGER fail_file_attributes BEFORE INSERT ON kb_attachment_data BEGIN SELECT RAISE(ABORT,'private SQL canary'); END");db.commit()
    assert upload(token=member)==(500,{'success':False,'error':'Failed to upload attachment'});assert snapshot()==before
    db.execute('DROP TRIGGER fail_file_attributes');db.commit()
    db.execute(f"CREATE TRIGGER late_upload_scope AFTER INSERT ON kb_attachment_data BEGIN UPDATE kb_cards SET assignee='' WHERE id={f['cardId']}; END");db.commit()
    assert upload(token=assigned)[0]==403;assert snapshot()==before
    db.execute('DROP TRIGGER late_upload_scope');db.commit()
    db.execute("INSERT INTO kb_meta (board_id,kind,item_id,setting,value) VALUES (?,'board',?,'allowsAttachments','0')",(f['boardId'],f['boardId']));db.commit();state=snapshot()
    assert upload(token=admin)==(403,{'success':False,'error':'Attachments are not allowed on this board'});assert snapshot()==state
    db.execute("DELETE FROM kb_meta WHERE board_id=? AND setting='allowsAttachments'",(f['boardId'],));db.commit()
    db.execute(f"CREATE TRIGGER late_upload_policy AFTER INSERT ON kb_attachment_data BEGIN INSERT INTO kb_meta (board_id,kind,item_id,setting,value) VALUES ({f['boardId']},'board',{f['boardId']},'allowsAttachments','0'); END");db.commit();state=snapshot()
    assert upload(token=member)==(403,{'success':False,'error':'Attachments are not allowed on this board'});assert snapshot()==state
    db.execute('DROP TRIGGER late_upload_policy');db.commit()
    for raw in (False,True):
        for name in ('space + plus % snowman ☃.txt','supplementary 🚀.bin'):
            status,data=upload(raw=raw,fileName=name);assert status==200 and data['fileName']==name,(raw,status,data)
            assert db.execute('SELECT filename FROM kb_files WHERE id=?',(data['attachmentId'],)).fetchone()[0]==name
    for encoded,expected in [('Y-W_j',b'\x63\xe5\xbf'),('!!!!',b''),('eA',b'x'),('Y WJj',b'abc'),('YW=Jj',b'a')]:
        status,data=call('/api/attachment/upload',json.dumps({**target,'fileName':'base64.bin','fileData':encoded}).encode(),owner)
        assert status==200 and data['fileSize']==len(expected),(encoded,status,data)
        stored=db.execute('SELECT content FROM kb_files WHERE id=?',(data['attachmentId'],)).fetchone()
        assert stored is not None and (stored[0] if stored[0] is not None else b'')==expected,(encoded,stored,expected.hex())
        # Gambas SQLite quote_blob represents a zero-length BLOB as SQL NULL.
        # The retained file row plus FileRecord.content.Data still represents zero bytes.
    for mime in ('text/plain','application/x-www-form-urlencoded','multipart/form-data; boundary=weba'):
        query=urllib.parse.urlencode({**target,'fileName':'raw-any-type.bin'})
        status,data=call('/api/attachment/upload?'+query,binary,owner,mime)
        assert status==200 and data['fileSize']==len(binary),(mime,status,data)
        assert db.execute('SELECT content FROM kb_files WHERE id=?',(data['attachmentId'],)).fetchone()[0]==binary
    status,data=upload(raw=True,content=b'');assert status==200 and data['fileSize']==0,(status,data)
    query=urllib.parse.urlencode({**target,'fileName':'x'})+'&fileName=duplicate'
    assert call('/api/attachment/upload?'+query,b'x',owner,'text/plain')[0]==400
    # Current owner, normal writer, assigned writer and nonmember global admin positives.
    for token in (owner,member,assigned,admin):
        for raw in (False,True):
            status,data=upload(token=token,raw=raw);assert status==200,(status,data)
            assert data=={'success':True,'attachmentId':data['attachmentId'],'fileName':'literal <upload>.bin','fileSize':len(binary),'storageBackend':'database','message':'Attachment uploaded successfully'},(raw,data,len(binary))
            file=int(data['attachmentId']);assert db.execute('SELECT content FROM kb_files WHERE id=?',(file,)).fetchone()[0]==binary
            attr=db.execute('SELECT mime,uploaded_ms,board_id,card_id FROM kb_attachment_data WHERE file_id=?',(file,)).fetchone();assert attr[0]=='application/x-weba-test' and attr[1]>0 and attr[2:]==(f['boardId'],f['cardId'])
    all_tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    def full_snapshot():return {t:sorted(db.execute('SELECT * FROM "'+t+'"').fetchall(),key=repr) for t in all_tables}
    saved_expiry=db.execute("SELECT quote(expires_at) FROM api_tokens WHERE username='rest-member' ORDER BY expires_at DESC LIMIT 1").fetchone()[0]
    saved_lane=db.execute('SELECT quote(title) FROM kb_lanes WHERE id=?',(f['swimlaneId'],)).fetchone()[0]
    mutations=[('member role',member,"UPDATE kb_members SET role='read-only' WHERE username='rest-member' AND board_id="+str(f['boardId']),"UPDATE kb_members SET role='normal' WHERE username='rest-member' AND board_id="+str(f['boardId']),403,'You do not have permission to modify this card'),('assigned writer',assigned,"UPDATE kb_cards SET assignee='' WHERE id="+str(f['cardId']),"UPDATE kb_cards SET assignee='rest-file-assigned' WHERE id="+str(f['cardId']),403,'You do not have permission to modify this card'),('token expiry',member,"UPDATE api_tokens SET expires_at='2000-01-01' WHERE username='rest-member'","UPDATE api_tokens SET expires_at="+saved_expiry+" WHERE username='rest-member'",401,'Invalid credentials'),('token principal',member,"UPDATE api_tokens SET username='rest-file-reader' WHERE username='rest-member'","UPDATE api_tokens SET username='rest-member' WHERE username='rest-file-reader' AND expires_at="+saved_expiry,401,'Invalid credentials'),('raw assigned flag',member,"INSERT INTO kb_member_flags (board_id,username,flag) VALUES ("+str(f['boardId'])+",'rest-member','isReadAssignedOnly')","DELETE FROM kb_member_flags WHERE board_id="+str(f['boardId'])+" AND username='rest-member' AND flag='isReadAssignedOnly'",403,'You do not have permission to modify this card'),('site admin',admin,"UPDATE users SET admin=0 WHERE username='rest-owner'","UPDATE users SET admin=1 WHERE username='rest-owner'",403,'You do not have permission to modify this card'),('target list',owner,"UPDATE kb_card_lists SET list_id=2147483647 WHERE card_id="+str(f['cardId']),"UPDATE kb_card_lists SET list_id="+str(f['listId'])+" WHERE card_id="+str(f['cardId']),400,"List ID does not match the card's list"),('target lane',owner,"UPDATE kb_lanes SET title='changed target' WHERE id="+str(f['swimlaneId']),"UPDATE kb_lanes SET title="+saved_lane+" WHERE id="+str(f['swimlaneId']),400,"Swimlane ID does not match the card's swimlane")]
    boundaries=[('AFTER INSERT ON kb_files','AFTER INSERT ON kb_attachment_data'),('AFTER INSERT ON kb_attachment_data','AFTER INSERT ON kb_activity'),('AFTER INSERT ON kb_activity','AFTER INSERT ON kb_history'),('AFTER INSERT ON kb_history',"AFTER UPDATE ON kb_item_changes WHEN NEW.kind='card' AND NEW.item_id="+str(f['cardId'])),("AFTER UPDATE ON kb_item_changes WHEN NEW.kind='card' AND NEW.item_id="+str(f['cardId']),None)]
    for raw in (False,True):
        for stage,restore_stage in boundaries:
            for name,token,restrict,restore,status,error in mutations:
                before=full_snapshot()
                db.execute('CREATE TRIGGER upload_boundary_loss '+stage+' BEGIN '+restrict+'; END')
                if restore_stage:db.execute('CREATE TRIGGER upload_boundary_restore '+restore_stage+' BEGIN '+restore+'; END')
                db.commit()
                try:
                    result=upload(token=token,raw=raw)
                    assert result==(status,{'success':False,'error':error}),(raw,stage,name,result)
                    assert full_snapshot()==before,(raw,stage,name,'rollback')
                finally:
                    db.execute('DROP TRIGGER upload_boundary_loss')
                    if restore_stage:db.execute('DROP TRIGGER upload_boundary_restore')
                    db.commit()
        assert upload(token=member,raw=raw)[0]==200
    # Permission is re-read after assignment removal; saved target IDs grant nothing.
    db.execute("UPDATE kb_cards SET assignee='' WHERE id=?",(f['cardId'],));db.commit();state=snapshot()
    assert upload(token=assigned,raw=True)[0]==403;assert upload(token=assigned)[0]==403;assert snapshot()==state
    db.execute("INSERT INTO kb_members (board_id,username,role) VALUES (?,?,'board-admin')",(f['boardId'],'rest-owner'))
    db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isNormalAssignedOnly')",(f['boardId'],'rest-owner'));db.commit();state=snapshot()
    assert upload(token=admin)[0]==403;assert snapshot()==state
print('Attachment upload REST: exact raw/JSON bytes/DTOs, full path, MIME/time metadata, four writer scopes, readonly/assignment-loss/raw-admin denial, configured byte limit and sanitized atomic rollback, per-boundary temporary role/assignment/raw/admin/target/token loss all-table rollback and retry passed')
