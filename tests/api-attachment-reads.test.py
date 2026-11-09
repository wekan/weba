"""Actual bearer attachment lists/info/base64/raw bytes and fresh read scope."""
import base64,json,os,sqlite3,subprocess,urllib.error,urllib.parse,urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
def call(route,method='GET',token=None,data=None,raw=False):
    request=urllib.request.Request(base+route,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},data=json.dumps(data).encode() if data is not None else None)
    try: response=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as error: response=error
    with response:
        body=response.read()
        return (response.status,body,dict(response.headers)) if raw else (response.status,json.loads(body))
def login(name):
    status,data=call('/users/login','POST',data={'username':name,'password':os.environ['WEBA_TEST_PASSWORD']});assert status==200
    return data['token']
def seed():return json.loads(subprocess.check_output([os.environ['GBX'],'-s','AttachmentFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0'}))
f=seed();foreign=seed();target={k:str(f[k]) for k in ('boardId','swimlaneId','listId','cardId')}
owner,admin,member,reader,assigned=(login(n) for n in ('rest-other','rest-owner','rest-member','rest-file-reader','rest-file-assigned'))
def upload(name,content,mime):
    status,data=call('/api/attachment/upload','POST',owner,{**target,'fileName':name,'fileType':mime,'fileData':base64.b64encode(content).decode() or '!!!!'});assert status==200,(status,data)
    return data['attachmentId']
name='Résumé + <literal> 🚀.bin';binary=bytes(range(256))+b'\x00\xff\r\n\r\nembedded\n\nbytes';file=upload(name,binary,'application/x-weba-test');image=upload('photo.png',b'PNG-test','image/png');empty=upload('empty.bin',b'','application/octet-stream');large=upload('large.bin',b'x'*513,'application/octet-stream')
board=str(f['boardId']);listing='/api/attachment/list/'+board
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    def snapshot():return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for (t,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")}
    db.execute('DELETE FROM kb_attachment_data WHERE file_id=?',(f['otherId'],));db.commit()
    legacy=call('/api/attachment/info/'+str(f['otherId']),token=owner)
    assert legacy[0]==200 and legacy[1]['fileType']=='application/octet-stream' and legacy[1]['createdAt'].endswith('Z'),legacy
    before=snapshot()
    for route in (listing,'/api/attachment/info/'+file,'/api/attachment/download/'+file):assert call(route)[0]==401
    assert call(listing,token=admin)==(403,{'success':False,'error':'You do not have permission to access this board'})
    for route in ('/api/attachment/info/'+file,'/api/attachment/download/'+file):assert call(route,token=admin)==(403,{'success':False,'error':'You do not have permission to access this attachment'})
    for token in (owner,member,reader,assigned):
        status,info=call('/api/attachment/info/'+file,token=token);assert status==200,(status,info)
        expected={'attachmentId':file,'fileName':name,'fileSize':len(binary),'fileType':'application/x-weba-test','storageBackend':'database','boardId':board,'swimlaneId':str(f['swimlaneId']),'listId':str(f['listId']),'cardId':str(f['cardId']),'createdAt':info['createdAt'],'isImage':False}
        assert info=={**expected,'success':True,'versions':[{'versionName':'original','storage':'database','size':len(binary),'type':'application/x-weba-test'}]},info
        assert info['createdAt'].endswith('Z')
        assert call('/api/attachment/download/'+file,token=token)==(200,{k:v for k,v in {**expected,'success':True,'base64Data':base64.b64encode(binary).decode()}.items() if k not in ('boardId','swimlaneId','listId','cardId','createdAt','isImage')})
        status,body,headers=call('/api/attachment/download/'+file+'?raw=1',token=token,raw=True);assert status==200 and body==binary,(status,body[:30])
        assert headers['Content-Type']=='application/x-weba-test' and headers['X-Content-Type-Options']=='nosniff'
        assert "sandbox" in headers['Content-Security-Policy'] and headers['Cache-Control']=='no-store'
        assert headers['Content-Disposition'].startswith('attachment; filename="Resume + <literal> .bin"; filename*=UTF-8\'\'')
        assert urllib.parse.unquote(headers['Content-Disposition'].split("filename*=UTF-8''")[1])==name
        assert not any(k.lower()=='x-weba-download-name' for k in headers)
    for suffix in ('?raw=1&raw=1','?raw=1&raw=0','?raw=1&raw','?raw&raw=1','?raw=+1','?raw=true'):
        status,data=call('/api/attachment/download/'+file+suffix,token=owner)
        assert status==200 and data['base64Data']==base64.b64encode(binary).decode(),(suffix,status,data)
        assert call('/api/attachment/info/'+file+suffix,token=owner)[0]==200
    assert call('/api/attachment/download/'+file+'?raw=%31',token=owner,raw=True)[1]==binary
    for suffix in ('',f"/{f['swimlaneId']}",f"/{f['swimlaneId']}/{f['listId']}",f"/{f['swimlaneId']}/{f['listId']}/{f['cardId']}",f"/null/null/{f['cardId']}"):
        status,data=call(listing+suffix,token=reader);assert status==200 and data['success'] is True and data['count']==len(data['attachments'])
        assert file in {item['attachmentId'] for item in data['attachments']}
        assert all('base64Data' not in item and 'versions' not in item for item in data['attachments'])
    assert call('/api/boards/'+board+'/attachments',token=owner)==call(listing,token=owner)
    assert call(listing+'/999999',token=owner)==(200,{'success':True,'attachments':[],'count':0})
    for card in ('999999',str(foreign['cardId'])):assert call(listing+'/null/null/'+card,token=owner)==(404,{'success':False,'error':'Card not found or does not belong to the specified board'})
    for ref in ('missing','999999','0'+file):assert call('/api/attachment/info/'+ref,token=owner)==(404,{'success':False,'error':'Attachment not found'})
    assert call('/api/attachment/info/'+image,token=owner)[1]['isImage'] is True
    assert call('/api/attachment/download/'+empty,token=owner)[1]['base64Data']==''
    assert call('/api/attachment/download/'+empty+'?raw=1',token=owner,raw=True)[1]==b''
    assert call('/api/attachment/info/'+large,token=owner)[0]==200
    for suffix in ('','?raw=1'):assert call('/api/attachment/download/'+large+suffix,token=owner)==(413,{'success':False,'error':'Attachment exceeds API download limit'})
    # Read APIs require membership; assigned metadata cannot enumerate another card.
    status,data=call(listing,token=assigned);assert status==200 and str(f['otherId']) not in {item['attachmentId'] for item in data['attachments']}
    for op in ('info','download'):assert call('/api/attachment/'+op+'/'+str(f['otherId']),token=assigned)[0]==403
    assert snapshot()==before
    # Listings hide soft-deleted files, direct authorized reads retain source history access.
    assert call('/api/attachment/delete/'+file,'DELETE',owner)[0]==200
    assert file not in {r['attachmentId'] for r in call(listing,token=owner)[1]['attachments']}
    assert call('/api/attachment/info/'+file,token=reader)[0]==200
    assert call('/api/attachment/download/'+file+'?raw=1',token=assigned,raw=True)[1]==binary
    # Role and assignment changes are checked on every read, including retained files.
    db.execute("UPDATE kb_cards SET assignee='' WHERE id=?",(f['cardId'],));db.execute('DELETE FROM kb_card_assignees WHERE card_id=?',(f['cardId'],));db.commit();state=snapshot()
    assert call(listing,token=assigned)==(200,{'success':True,'attachments':[],'count':0})
    for op in ('info','download'):assert call('/api/attachment/'+op+'/'+file,token=assigned)[0]==403
    assert snapshot()==state
    db.execute("UPDATE kb_members SET role='board-admin' WHERE board_id=? AND username='rest-file-assigned'",(f['boardId'],));db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isReadAssignedOnly')",(f['boardId'],'rest-file-assigned'));db.commit()
    assert call('/api/attachment/info/'+file,token=assigned)[0]==403
    db.execute("DELETE FROM kb_members WHERE board_id=? AND username='rest-file-reader'",(f['boardId'],));db.commit()
    assert call(listing,token=reader)[0]==403
    db.execute("INSERT INTO kb_members (board_id,username,role) VALUES (?,?,'read-only')",(f['boardId'],'rest-owner'));db.commit()
    assert call('/api/attachment/info/'+file,token=admin)[0]==200
    db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isReadAssignedOnly')",(f['boardId'],'rest-owner'));db.commit()
    assert call('/api/attachment/info/'+file,token=admin)[0]==403
    db.execute("DELETE FROM kb_member_flags WHERE board_id=? AND username='rest-owner'",(f['boardId'],));db.execute("DELETE FROM kb_members WHERE board_id=? AND username='rest-owner'",(f['boardId'],));db.commit()
    # Unexpected driver/schema failures stay opaque and perform no writes.
    db.execute('ALTER TABLE kb_attachment_data RENAME COLUMN mime TO private_sql_canary');db.commit();state=snapshot()
    result=call('/api/attachment/info/'+image,token=owner)
    assert result==(500,{'success':False,'error':'Attachment read failed'}),result
    assert snapshot()==state
    db.execute('ALTER TABLE kb_attachment_data RENAME COLUMN private_sql_canary TO mime');db.commit()
print('Attachment read REST: live scoped metadata lists/legacy alias, exact info/versions/base64/raw bytes and Unicode safe headers, zero/legacy files, read-only/global-member/assigned scope, retained history reads, limits and sanitized no-write failures passed')
