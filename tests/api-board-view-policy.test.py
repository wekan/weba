"""Actual native HTTP settings routes: authority, parsing and atomic writes."""
import hashlib,json,os,sqlite3,subprocess,urllib.request,urllib.error,urllib.parse
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
def fixture(mode):return json.loads(subprocess.check_output([os.environ['GBX'],'-s','PublicBoardFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0','WEBA_PUBLIC_MODE':mode,'WEBA_PUBLIC_ID':str(globals().get('board',0))}))
board=fixture('view-api-seed')['boardId'];route=f'/api/boards/{board}/boardViewSettings'
def call(path=route,method='GET',token=None,data=None,mime='application/json'):
    body=None if data is None else data.encode() if isinstance(data,str) else json.dumps(data).encode()
    request=urllib.request.Request(base+path,method=method,headers={'Content-Type':mime,**({'Authorization':'Bearer '+token} if token else {})},data=body)
    try:r=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as e:r=e
    with r:return r.status,json.loads(r.read())
def login(user):
    status,data=call('/users/login','POST',data={'username':user,'password':os.environ['WEBA_TEST_PASSWORD']});assert status==200
    return data['token']
owner=login('rest-other');admin=login('rest-owner');member=login('rest-member')
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    def frame(role=None,raw=(),removed=False):
        db.execute("DELETE FROM kb_members WHERE board_id=? AND username='rest-member'",(board,));db.execute("DELETE FROM kb_member_flags WHERE board_id=? AND username='rest-member'",(board,));db.execute("DELETE FROM kb_removed_members WHERE board_id=? AND username='rest-member'",(board,))
        if role:db.execute("INSERT INTO kb_members (board_id,username,role) VALUES (?,'rest-member',?)",(board,role))
        for flag in raw:db.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,'rest-member',?)",(board,flag))
        if removed:db.execute("INSERT INTO kb_removed_members (board_id,username,role) VALUES (?,'rest-member','normal')",(board,))
        db.commit()
    def snapshot():
        names=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'kb_%' OR name IN ('account_sessions','api_tokens'))")]
        return {name:sorted(db.execute('SELECT * FROM '+name).fetchall(),key=repr) for name in names}
    assert call()[0]==401
    assert call(method='PUT',data='{broken')[0]==401
    status,initial=call(token=owner);assert status==200 and len(initial['keys'])==40 and len(initial['boardViewOrder'])==40
    assert not db.execute("SELECT name FROM sqlite_master WHERE name='kb_board_view_policy'").fetchone(),'GET initialized policy'
    assert call(method='POST',token=owner,data={})[0]==405
    assert call('/api/boards/bad/boardViewSettings',token=owner)[0]==400
    assert call('/api/boards/2147483647/boardViewSettings',token=owner)[0]==404
    for role in ['normal','read-only','no-comments','comment-only','worker','normal-assigned-only','comment-assigned-only','read-assigned-only','board-admin','unknown']:
        frame(role);before=snapshot();assert call(token=member)[0]==(403 if role in ['no-comments','comment-only','worker','normal-assigned-only','comment-assigned-only','read-assigned-only'] else 200),role
        if role!='board-admin':assert call(method='PUT',token=member,data={'defaultPublicBoardView':'board-view-table'})[0]==403,role
        assert snapshot()==before
    frame('board-admin',('isReadAssignedOnly',));assert call(token=member)[0]==403;assert call(method='PUT',token=member,data={'defaultPublicBoardView':'board-view-table'})[0]==200
    frame('normal',('isAdmin',));assert call(method='PUT',token=member,data={'defaultPrivateBoardView':'board-view-cal'})[0]==200
    frame('board-admin',removed=True);before=snapshot();assert call(token=member)[0]==403;assert call(method='PUT',token=member,data={})[0]==403;assert snapshot()==before
    frame();fixture('public');assert call(token=member)[0]==403
    assert call(token=admin)[0]==200
    change={'defaultPublicBoardView':'board-view-table','boardViewSettings':{'board-view-swimlanes':{'showOnPublic':False}},'boardViewOrder':['board-view-cal','board-view-table','board-view-table']}
    status,data=call(method='PUT',token=owner,data=change);assert status==200 and data['defaultPublicBoardView']=='board-view-table' and data['boardViewOrder'][:2]==['board-view-cal','board-view-table']
    assert call(token=owner)==(200,data)
    forms=urllib.parse.urlencode({'defaultPublicBoardView':'board-view-lists','boardViewSettings':json.dumps({'board-view-table':{'showOnPublic':None}}),'boardViewOrder':'board-view-lists, board-view-table'})
    status,data=call(method='PUT',token=owner,data=forms,mime='application/x-www-form-urlencoded');assert status==200,(status,data);assert data['boardViewSettings']['board-view-table']['showOnPublic'] is False,(status,data['boardViewSettings']['board-view-table']);assert data['boardViewOrder'][0]=='board-view-lists',data['boardViewOrder'][:3]
    status,data=call(method='PUT',token=owner,data='boardViewOrder=board-view-table&boardViewOrder=board-view-cal',mime='application/x-www-form-urlencoded');assert status==200 and data['boardViewOrder'][:2]==['board-view-table','board-view-cal']
    for payload in [{},{'unused':1},{'boardViewSettings':{}},{'defaultPublicBoardView':True},{'boardViewOrder':['unknown']},{'boardViewSettings':{'board-view-lists':{'showOnPublic':False}}},{'boardViewSettings':None},{'boardViewOrder':None}]:
        before=snapshot();assert call(method='PUT',token=owner,data=payload)[0]==400,payload;assert snapshot()==before
    before=snapshot();assert call(method='PUT',token=owner,data='defaultPublicBoardView=board-view-table&defaultPublicBoardView=board-view-cal',mime='application/x-www-form-urlencoded')[0]==400;assert snapshot()==before
    assert call(method='PUT',token=owner,data='{broken')[0]==400
    assert call(method='PUT',token=owner,data='plain',mime='text/plain')[0]==415
    for sql,expected in [("SELECT RAISE(ABORT,'SQL-PRIVATE-CANARY')",500),("UPDATE kb_members SET role='read-only' WHERE board_id=NEW.board_id AND username='rest-member'",403),("DELETE FROM api_tokens WHERE username='rest-other'",401)]:
        token=owner
        if expected==403:frame('board-admin');token=member
        before=snapshot();db.execute(f'CREATE TRIGGER view_api_inject AFTER UPDATE ON kb_board_view_policy BEGIN {sql}; END');db.commit()
        status,data=call(method='PUT',token=token,data={'defaultPublicBoardView':'board-view-table'});assert status==expected,(status,data);assert 'CANARY' not in json.dumps(data);assert snapshot()==before
        db.execute('DROP TRIGGER view_api_inject');db.commit()
    assert call(method='PUT',token=owner,data={'defaultPublicBoardView':'board-view-table'})[0]==200
    db.execute('DELETE FROM api_tokens WHERE digest=?',(hashlib.sha256(owner.encode()).hexdigest(),));db.commit();before=snapshot();assert call(token=owner)[0]==401;assert call(method='PUT',token=owner,data={})[0]==401;assert snapshot()==before
    # Keep the surrounding shared HTTP harness independent of this fixture.
    for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        if 'board_id' in [r[1] for r in db.execute('PRAGMA table_info("'+name+'")')]:db.execute('DELETE FROM "'+name+'" WHERE board_id=?',(board,))
    db.execute('DELETE FROM kb_boards WHERE id=?',(board,));db.commit()
print('Board view REST: source-shaped normalized GET/PUT, legacy no-init, read/admin/raw/assigned/inactive/public distinctions, JSON/form/null/order coercion, malformed/no-op/default-hide guards, opaque atomic failure/retry and late role/token revocation passed')
