"""Actual list DELETE: reversible cascade, source no-op contract and privacy."""
import json, os, sqlite3, subprocess, urllib.error, urllib.request
from pathlib import Path
base = os.environ['WEBA_TEST_URL']
def fixture(mode, board=0, list_id=0, **extra):
    return json.loads(subprocess.check_output([os.environ['GBX'], '-s', 'ListDeletionFixture', os.environ['WEBA_TEST_PROJECT']], text=True,
        env={**os.environ, 'WEBA_API_REQUEST':'0', 'WEBA_LIST_MODE':mode, 'WEBA_LIST_BOARD':str(board), 'WEBA_LIST_ID':str(list_id), **extra}))
def call(route, method='GET', token=None, data=None):
    request=urllib.request.Request(base+route, method=method, headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+token} if token else {})}, data=json.dumps(data).encode() if data is not None else None)
    try: response=urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error: response=error
    with response:
        assert response.headers.get_content_type()=='application/json'
        return response.status, json.loads(response.read())
def login(name):
    status,data=call('/users/login','POST',data={'username':name,'password':os.environ['WEBA_TEST_PASSWORD']});assert status==200,(name,status)
    return data['token']
f=fixture('seed');foreign=fixture('seed');board,list_id,card,archived,parent=(str(f[k]) for k in ('boardId','listId','cardId','archivedCardId','parentId'))
route=f'/api/boards/{board}/lists/{list_id}'
owner,admin,member,reader,assigned=(login(n) for n in ('rest-other','rest-owner','rest-member','rest-list-reader','rest-list-assigned'))
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
    def snapshot(): return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for t in tables}
    before=snapshot()
    assert call(route,'DELETE')[0]==401
    for token in (reader,assigned):
        assert call(route,'DELETE',token)[0]==403
        assert snapshot()==before
    for ref in ('999999',str(foreign['listId']),'not-a-list','0','0'+list_id):
        status,data=call(f'/api/boards/{board}/lists/{ref}','DELETE',owner)
        assert (status,data)==(200,{'_id':ref}),(status,data)
        assert snapshot()==before
    for role in ('read-only','comment-only','worker','normal-assigned-only','comment-assigned-only','read-assigned-only'):
        fixture('role',board,list_id,WEBA_LIST_ROLE=role)
        state=snapshot();assert call(route,'DELETE',member)[0]==403;assert snapshot()==state
    fixture('role',board,list_id,WEBA_LIST_ROLE='normal')
    for flag in ('isNormalAssignedOnly','isCommentAssignedOnly','isReadAssignedOnly'):
        fixture('role',board,list_id,WEBA_LIST_ROLE='board-admin')
        db.execute('INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,?)',(board,'rest-member',flag));db.commit()
        state=snapshot();assert call(route,'DELETE',member)[0]==403;assert snapshot()==state
        db.execute('DELETE FROM kb_member_flags WHERE board_id=? AND username=? AND flag=?',(board,'rest-member',flag));db.commit()
    fixture('role',board,list_id,WEBA_LIST_ROLE='normal')
    # Opaque driver errors are sanitized and all rows/clocks/batch allocation roll back.
    db.execute(f"CREATE TRIGGER fail_list_delete BEFORE INSERT ON kb_deleted_items WHEN NEW.kind='list' AND NEW.item_id={int(list_id)} BEGIN SELECT RAISE(ABORT,'private SQL canary'); END");db.commit()
    before=snapshot();status,data=call(route,'DELETE',owner);assert status==500 and data=={'error':'List deletion failed'},(status,data);assert snapshot()==before
    db.execute('DROP TRIGGER fail_list_delete');db.commit()
    # Native list writers can have assigned scope, but this REST route cannot:
    # a flag injected during the inner native operation must fail its outer API guard.
    db.execute(f"CREATE TRIGGER late_list_scope AFTER INSERT ON kb_deleted_items WHEN NEW.kind='list' AND NEW.item_id={int(list_id)} BEGIN INSERT INTO kb_member_flags (board_id,username,flag) VALUES ({int(board)},'rest-member','isNormalAssignedOnly'); END");db.commit()
    before=snapshot();assert call(route,'DELETE',member)[0]==403;assert snapshot()==before
    db.execute('DROP TRIGGER late_list_scope');db.commit()
    status,data=call(route,'DELETE',member);assert (status,data)==(200,{'_id':list_id}),(status,data)
    marks=db.execute('SELECT kind,item_id,batch_id,actor,deleted_at FROM kb_deleted_items WHERE board_id=? ORDER BY kind,item_id',(board,)).fetchall()
    assert len(marks)==3 and {r[3] for r in marks}=={'rest-member'} and len({r[2] for r in marks})==1 and len({r[4] for r in marks})==1 and marks[0][4]>0,marks
    assert db.execute('SELECT COUNT(*) FROM kb_cards WHERE board_id=?',(board,)).fetchone()[0]==3
    assert db.execute('SELECT content FROM kb_files WHERE board_id=?',(board,)).fetchone()[0]==b'kept\x00bytes'
    for token in (owner,admin):
        status,lists=call(f'/api/boards/{board}/lists',token=token);assert status==200 and list_id not in {r['_id'] for r in lists}
        assert call(f'/api/boards/{board}/cards_count',token=token)==(200,{'board_cards_count':1})
        assert call(f'/api/boards/{board}/lists/{list_id}/cards',token=token)==(200,[])
        for deleted_card in (card,archived): assert call('/api/cards/'+deleted_card,token=token)[0]==404
    state=snapshot();assert call(route,'DELETE',owner)==(200,{'_id':list_id});assert snapshot()==state
    status,data=call(f'{route}/cards/{card}','PUT',owner,{'description':'stale overwrite'});assert status==404 and data=={'error':'Card not found'},(status,data);assert snapshot()==state
    assert call(f'{route}/cards/{card}/archive','POST',owner)[0]==404;assert snapshot()==state
    fixture('restore',board,list_id)
    assert call('/api/cards/'+card,token=owner)[0]==200 and call('/api/cards/'+archived,token=owner)[1]['archived'] is True
    assert db.execute('SELECT description FROM kb_cards WHERE id=?',(card,)).fetchone()[0]=='Kept body'
    # Explicit REST site-admin scope may delete without membership, then resets.
    assert call(route,'DELETE',admin)==(200,{'_id':list_id});fixture('restore',board,list_id)
print('List DELETE REST: source idempotent/missing/foreign contract, roles/raw assigned flags, site-admin scope, hidden reads/counts/writes, retained bytes/archive state, sanitized rollback and late-scope atomicity passed')
