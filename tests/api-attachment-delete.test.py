"""Bearer deletion keeps bytes, scopes assigned writers, and rolls back failures."""
import json, os, sqlite3, subprocess, urllib.error, urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
def call(route,method='DELETE',token=None,data=None):
    request=urllib.request.Request(base+route,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},data=json.dumps(data).encode() if data is not None else None)
    try: response=urllib.request.urlopen(request,timeout=15)
    except urllib.error.HTTPError as error: response=error
    with response: return response.status,json.loads(response.read())
def login(name):
    status,data=call('/users/login','POST',data={'username':name,'password':os.environ['WEBA_TEST_PASSWORD']}); assert status==200
    return data['token']
f=json.loads(subprocess.check_output([os.environ['GBX'],'-s','AttachmentFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0'}))
owner,admin,member,reader,assigned=(login(n) for n in ('rest-other','rest-owner','rest-member','rest-file-reader','rest-file-assigned'))
board,card,file=(f[k] for k in ('boardId','cardId','fileId'));route='/api/attachment/delete/'+str(file)
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
    def snapshot(): return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for t in tables}
    state=snapshot();assert call(route)[0]==401
    assert call(route,token=reader)==(403,{'success':False,'error':'You do not have permission to delete this attachment'})
    assert call('/api/attachment/delete/'+str(f['otherId']),token=assigned)[0]==403;assert snapshot()==state
    for ref in ('missing','999999','0'+str(file)):
        assert call('/api/attachment/delete/'+ref,token=owner)==(404,{'success':False,'error':'Attachment not found'})
    assert snapshot()==state
    db.execute(f"CREATE TRIGGER fail_file_history BEFORE INSERT ON kb_attachment_history WHEN NEW.file_id={file} BEGIN SELECT RAISE(ABORT,'private SQL canary'); END");db.commit()
    assert call(route,token=member)==(500,{'success':False,'error':'Attachment deletion failed'});assert snapshot()==state
    db.execute('DROP TRIGGER fail_file_history');db.commit()
    db.execute(f"CREATE TRIGGER late_file_scope AFTER INSERT ON kb_attachment_history WHEN NEW.file_id={file} BEGIN UPDATE kb_cards SET assignee='' WHERE id={card}; END");db.commit()
    assert call(route,token=assigned)[0]==403;assert snapshot()==state
    db.execute('DROP TRIGGER late_file_scope');db.commit()
    expected=(200,{'success':True,'attachmentId':str(file),'fileName':'retained <literal>.bin','message':'Attachment deleted successfully'})
    assert call(route,token=assigned)==expected
    assert db.execute('SELECT content FROM kb_files WHERE id=?',(file,)).fetchone()[0]==b'kept\x00bytes'
    assert db.execute('SELECT actor FROM kb_attachment_deletions WHERE file_id=?',(file,)).fetchone()[0]=='rest-file-assigned'
    assert db.execute("SELECT COUNT(*) FROM kb_meta WHERE board_id=? AND kind='card' AND item_id=? AND setting='cover'",(board,card)).fetchone()[0]==0
    state=snapshot();assert call(route,token=member)==expected;assert snapshot()==state
    assert call('/api/attachment/delete/'+str(f['otherId']),token=admin)[0]==200
    # A site administrator with active raw assigned-only flags stays card-scoped.
    db.execute("INSERT INTO kb_members (board_id,username,role) VALUES (?,?,'board-admin')",(board,'rest-owner'))
    db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isNormalAssignedOnly')",(board,'rest-owner'));db.commit()
    state=snapshot();assert call(route,token=admin)[0]==403;assert snapshot()==state
print('Attachment DELETE REST: bearer auth, missing/idempotent DTOs, retained bytes, cover clearing, assigned writer/site-admin scope and sanitized atomic failure passed')
