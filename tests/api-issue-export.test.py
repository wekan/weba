"""Actual external export HTTP, field selections, response bytes and final guards."""
import hashlib,json,os,sqlite3,subprocess,traceback,urllib.error,urllib.parse,urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET
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
        db.execute('UPDATE kb_cards SET description=?,labels=?,due_day=? WHERE id=?',('<literal> Ω\nquote "', '\u00a0one\ufeff,one, Ω','2026-11-14',f['cardId']))
        db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND title=?',('incomplete',board,'Todo'));db.commit()
        items=[{'title':'Retained attachments','description':'<literal> Ω\nquote "','listTitle':'incomplete','labels':['one','one','Ω'],'dueAt':'2026-11-14T00:00:00.000Z','endAt':'2026-11-13T01:02:03.004Z','owner':'rest-file-assigned','assignees':['rest-member','rest-file-assigned'],'comments':seeded['comments']}, {'title':'Unassigned attachments','description':'','listTitle':'incomplete','labels':[]}]
        active_cards=db.execute('SELECT c.id,cl.list_id FROM kb_cards c LEFT JOIN kb_card_lists cl ON cl.board_id=c.board_id AND cl.card_id=c.id WHERE c.board_id=? AND c.archived=0 ORDER BY c.id',(board,)).fetchall()
        assert len(active_cards)==len(items)
        for item,(card_id,list_id) in zip(items,active_cards):
            item['cardId']=str(card_id);item['listId']=str(list_id)
        source_lists=[{'_id':str(row[0]),'title':row[1]} for row in db.execute('SELECT id,title FROM kb_lists WHERE board_id=? ORDER BY lane,sort_order,id',(board,))]
        source_swimlanes=[{'_id':row[0],'title':row[0]} for row in db.execute('SELECT title FROM kb_lanes WHERE board_id=? ORDER BY id',(board,))]
        parent,child=(int(item['cardId']) for item in items)
        checklist=db.execute("INSERT INTO kb_entries(board_id,card_id,kind,title) VALUES(?,?,'checklist','Literal checklist Ω')",(board,parent)).lastrowid
        for title,done in [('Checked Ω',1),('Unchecked',0)]:
            db.execute("INSERT INTO kb_entries(board_id,card_id,kind,parent_id,title,done) VALUES(?,?,'checkitem',?,?,?)",(board,parent,checklist,title,done))
        db.execute("INSERT INTO kb_entries(board_id,card_id,kind,amount) VALUES(?,?,'subtask',?)",(board,parent,child))
        for target,parent_id in [(parent,99999999),(child,checklist)]:
            db.execute("INSERT INTO kb_entries(board_id,card_id,kind,parent_id,title,done) VALUES(?,?,'checkitem',?,'API_HIDDEN_ORPHAN_CHECK',0)",(board,target,parent_id))
        # Reciprocal duplicates, self and missing targets must not duplicate links.
        for origin,target in [(parent,child),(child,parent),(parent,parent),(parent,99999999)]:
            db.execute("INSERT INTO kb_entries(board_id,card_id,kind,amount) VALUES(?,?,'dependency',?)",(board,origin,target))
        db.commit()
        items[0]['checklists']=[{'title':'Literal checklist Ω','items':[{'title':'Checked Ω','done':True},{'title':'Unchecked','done':False}]}]
        items[1]['parentCardId']=str(parent)
        items[0]['dependencies']=[{'cardId':str(target),'type':'relatesTo'} for target in [child,parent,99999999]]
        items[1]['dependencies']=[{'cardId':str(parent),'type':'relatesTo'}]
        source_board={'title':'Attachment lifecycle board'}
        def snapshot():
            names=[row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'kb_%' OR name IN ('api_tokens','import_export_settings','users'))")]
            return {name:sorted(db.execute('SELECT * FROM '+name).fetchall(),key=repr) for name in names}
        for fmt in ['github','gitea','forgejo','gitlab','trello','deck','kanboard','markdown','leo']:
            url=f'/api/boards/{board}/export/{fmt}'
            status,data,headers=call(url,token=owner);assert status==200,(status,data)
            assert headers['Content-Type']==('text/markdown; charset=utf-8' if fmt=='markdown' else 'application/xml; charset=utf-8' if fmt=='leo' else 'application/json; charset=utf-8')
            cases.append({'format':fmt,'fields':None,'items':items,'actual':data,'contentType':headers['Content-Type']})
            assert headers['Cache-Control']=='no-store' and headers['X-Content-Type-Options']=='nosniff'
            before=snapshot()
            for fields in [None,'','unknown','labels','dates','description','people','labels,dates','labels,description','dates,description','labels,dates,description','\u00a0labels\ufeff, unknown','board-header','sort,scrum','Labels','comments','people,comments','dates,comments','description,people,comments','labels,dates,people,comments','checklists','subtasks','dependencies','subtasks,dependencies','checklists,comments,people']:
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
            if fmt=='trello':
                db.execute('DELETE FROM kb_card_lists WHERE board_id=? AND card_id=?',(board,f['cardId']));db.commit()
                status,data=pair(url,token=owner);assert status==200 and 'idList' not in data['cards'][0]
                orphan_items=[{key:value for key,value in item.items() if key!='listId'} if index==0 else dict(item) for index,item in enumerate(items)]
                orphan_items[0]['listTitle']=''
                cases.append({'format':fmt,'fields':None,'items':orphan_items,'actual':data})
                db.execute('INSERT INTO kb_card_lists(board_id,card_id,list_id) VALUES(?,?,?)',(board,f['cardId'],f['listId']));db.commit()
            if fmt in ['deck','markdown','leo']:
                other_list=next(row for row in source_lists if row['title']=='Doing')
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('incomplete',board,int(other_list['_id'])));db.commit()
                status,data=pair(url,token=owner);assert status==200
                if fmt=='deck':
                    repeated=[stack for stack in data['stacks'] if stack['title']=='incomplete'];assert len(repeated)==2 and all(len(stack['cards'])==2 for stack in repeated)
                elif fmt=='markdown':assert data.count('## incomplete\n')==2
                else:assert data.count('<vh>incomplete</vh>')==2
                cases.append({'format':fmt,'fields':None,'items':items,'lists':[{**row,'title':'incomplete' if row['_id']==other_list['_id'] else row['title']} for row in source_lists],'actual':data})
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('Doing',board,int(other_list['_id'])));db.commit()
                db.execute('DELETE FROM kb_card_lists WHERE board_id=? AND card_id=?',(board,f['cardId']))
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('',board,f['listId']));db.commit()
                status,data=pair(url,token=owner);assert status==200
                if fmt=='deck':assert len(next(stack for stack in data['stacks'] if stack['title']=='')['cards'])==2
                elif fmt=='markdown':assert data.count('- [ ] Retained attachments')==1 and data.count('- [ ] Unassigned attachments')==1
                else:assert data.count('<vh>Retained attachments</vh>')==1 and data.count('<vh>Unassigned attachments</vh>')==1
                orphan_items=[{**{key:value for key,value in item.items() if index!=0 or key!='listId'},'listTitle':''} for index,item in enumerate(items)]
                cases.append({'format':fmt,'fields':None,'items':orphan_items,'lists':[{**row,'title':'' if row['_id']==str(f['listId']) else row['title']} for row in source_lists],'actual':data})
                db.execute('INSERT INTO kb_card_lists(board_id,card_id,list_id) VALUES(?,?,?)',(board,f['cardId'],f['listId']))
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('incomplete',board,f['listId']));db.commit()
                if fmt=='deck':
                    note_id,created=db.execute("SELECT id,created_at FROM kb_entries WHERE board_id=? AND card_id=? AND kind='comment' ORDER BY id LIMIT 1",(board,f['cardId'])).fetchone()
                    db.execute('UPDATE kb_entries SET created_at=NULL WHERE id=?',(note_id,));db.commit()
                    status,data=pair(url,token=owner);assert status==200 and 'creationDateTime' not in data['stacks'][0]['cards'][0]['comments'][0]
                    legacy_items=[dict(item) for item in items];legacy_items[0]['comments']=[{key:value for key,value in note.items() if index!=0 or key!='date'} for index,note in enumerate(items[0]['comments'])]
                    cases.append({'format':fmt,'fields':None,'items':legacy_items,'actual':data})
                    db.execute('UPDATE kb_entries SET created_at=? WHERE id=?',(created,note_id));db.commit()
            if fmt in ['markdown','leo']:
                for title in ['FINISHED','unfinished','fınıshed','FİNISHED','finiſhed','archiv Ω']:
                    db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',(title,board,f['listId']));db.commit()
                    status,data=pair(url,token=owner);assert status==200
                    cases.append({'format':fmt,'fields':None,'items':[{**item,'listTitle':title} for item in items],'lists':[{**row,'title':title if row['_id']==str(f['listId']) else row['title']} for row in source_lists],'actual':data})
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('incomplete',board,f['listId']))
                description='Line one\r\n\n \n\t\n<literal> 😀\n'
                db.execute('UPDATE kb_cards SET description=? WHERE id=?',(description,f['cardId']));db.commit()
                for fields in [None,'description','labels']:
                    status,data=pair(url+('' if fields is None else '?fields='+fields),token=owner);assert status==200
                    cases.append({'format':fmt,'fields':fields,'items':[{**item,'description':description} if index==0 else item for index,item in enumerate(items)],'actual':data})
                db.execute('UPDATE kb_cards SET description=? WHERE id=?',(items[0]['description'],f['cardId']))
                db.execute('UPDATE kb_boards SET title=? WHERE id=?',('',board));db.commit()
                status,data=pair(url,token=owner);assert status==200
                if fmt=='markdown':assert data.startswith('# Imported board\n')
                else:assert ET.fromstring(data).find('leo_header').attrib['wekan_board']==''
                cases.append({'format':fmt,'fields':None,'items':items,'board':{'title':''},'actual':data})
                db.execute('UPDATE kb_boards SET title=? WHERE id=?',(source_board['title'],board))
                db.executemany('UPDATE kb_cards SET archived=1 WHERE id=?',[(int(item['cardId']),) for item in items]);db.commit()
                status,data=pair(url,token=owner);assert status==200
                if fmt=='markdown':assert data=='# '+source_board['title']+'\n'
                else:assert len(ET.fromstring(data).find('vnodes'))==len(source_lists)
                cases.append({'format':fmt,'fields':None,'items':[],'actual':data})
                db.executemany('UPDATE kb_cards SET archived=0 WHERE id=?',[(int(item['cardId']),) for item in items]);db.commit()
            if fmt=='leo':
                literal='<outline & "quoted"> Ω 😀'
                body='XML <&> "body"\n\nlast\r\n'
                db.execute('UPDATE kb_boards SET title=? WHERE id=?',(literal,board))
                db.execute('UPDATE kb_cards SET title=?,description=? WHERE id=?',(literal,body,f['cardId']))
                db.execute('UPDATE kb_entries SET title=? WHERE id=?',(literal,checklist))
                check_id=db.execute("SELECT id FROM kb_entries WHERE parent_id=? AND kind='checkitem' ORDER BY id LIMIT 1",(checklist,)).fetchone()[0]
                db.execute('UPDATE kb_entries SET title=? WHERE id=?',(literal,check_id))
                empty_check=db.execute("INSERT INTO kb_entries(board_id,card_id,kind,title) VALUES(?,?,'checklist','Empty & check')",(board,parent)).lastrowid;db.commit()
                rich_items=[{**item,'title':literal,'description':body,'checklists':[{'title':literal,'items':[{'title':literal,'done':True},{'title':'Unchecked','done':False}]},{'title':'Empty & check','items':[]}]} if index==0 else item for index,item in enumerate(items)]
                for fields in [None,'description','checklists','description,checklists','labels']:
                    status,data=pair(url+('' if fields is None else '?fields='+fields),token=reader);assert status==200
                    parsed=ET.fromstring(data);assert parsed.find('leo_header').attrib['wekan_board']==literal
                    cases.append({'format':fmt,'fields':fields,'items':rich_items,'board':{'title':literal},'actual':data})
                db.execute('UPDATE kb_boards SET title=? WHERE id=?',(source_board['title'],board))
                db.execute('UPDATE kb_cards SET title=?,description=? WHERE id=?',(items[0]['title'],items[0]['description'],f['cardId']))
                db.execute('UPDATE kb_entries SET title=? WHERE id=?',('Literal checklist Ω',checklist))
                db.execute('UPDATE kb_entries SET title=? WHERE id=?',('Checked Ω',check_id))
                db.execute('DELETE FROM kb_entries WHERE id=?',(empty_check,));db.commit()
            if fmt=='gitlab':
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('Doing',board,f['listId']));db.commit()
                status,data=pair(url,token=owner);assert status==200
                assert all(row['state']=='opened' and 'closed_at' not in row for row in data)
                cases.append({'format':fmt,'fields':None,'items':[{**item,'listTitle':'Doing'} for item in items],'lists':[{**row,'title':'Doing' if row['_id']==str(f['listId']) else row['title']} for row in source_lists],'actual':data})
                db.execute('UPDATE kb_lists SET title=? WHERE board_id=? AND id=?',('incomplete',board,f['listId']));db.commit()
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
        for target in [url,f'/api/boards/{board}/export/markdown',f'/api/boards/{board}/export/leo']:
            assert pair(target,token=reader)==(403,{'error':'Forbidden'});assert snapshot()==before
        db.execute('DROP TRIGGER issue_role');db.commit()
        # Final token and export policy checks roll back injected mutations.
        digest=hashlib.sha256(owner.encode()).hexdigest()
        for effect,expected in [(f"DELETE FROM api_tokens WHERE digest='{digest}'",(401,{'error':'Invalid token'})),('UPDATE import_export_settings SET disable_export=1 WHERE id=1',(403,'Export is disabled by the administrator.'))]:
            db.execute(f'CREATE TRIGGER issue_late AFTER UPDATE OF title ON kb_boards WHEN NEW.id={board} BEGIN {effect}; END');db.commit();before=snapshot()
            for target in [url,f'/api/boards/{board}/export/markdown',f'/api/boards/{board}/export/leo']:
                assert pair(target,token=owner)==expected;assert snapshot()==before
            db.execute('DROP TRIGGER issue_late');db.commit();assert pair(url,token=owner)[0]==200
        db.execute('UPDATE kb_boards SET archived=1 WHERE id=?',(board,));db.commit();assert pair(url,token=owner)[0]==200
        db.execute('UPDATE kb_boards SET archived=0 WHERE id=?',(board,));db.commit()
        fixture('IssueApiFixture',{'WEBA_ISSUE_BOARD':str(board),'WEBA_ISSUE_PERMISSION':'public'})
        before=snapshot()
        for suffix in ['', '?authToken=bad','?authToken='+('x'*10001),'?authToken=a&authToken=b']:
            status,data=pair(url+suffix);assert status==200,(status,data)
            cases.append({'format':'github','fields':None,'items':items,'actual':data})
        assert pair(url,token=assigned)[0]==200
        leo_url=f'/api/boards/{board}/export/leo'
        for fields in [None,'description','checklists','people']:
            status,data=pair(leo_url+'?authToken=bad'+('' if fields is None else '&fields='+fields));assert status==200
            cases.append({'format':'leo','fields':fields,'items':items,'actual':data})
        markdown_url=f'/api/boards/{board}/export/markdown'
        for fields in [None,'labels','description']:
            status,data=pair(markdown_url+'?authToken=bad'+('' if fields is None else '&fields='+fields));assert status==200
            cases.append({'format':'markdown','fields':fields,'items':items,'actual':data})
        kanboard_url=f'/api/boards/{board}/export/kanboard'
        for fields in [None,'comments','checklists','subtasks,dependencies']:
            status,data=pair(kanboard_url+'?authToken=bad'+('' if fields is None else '&fields='+fields));assert status==200
            cases.append({'format':'kanboard','fields':fields,'items':items,'actual':data})
        deck_url=f'/api/boards/{board}/export/deck'
        for fields in [None,'comments']:
            query='?authToken=bad'+('' if fields is None else '&fields='+fields)
            status,data=pair(deck_url+query);assert status==200
            cases.append({'format':'deck','fields':fields,'items':items,'actual':data})
        trello_url=f'/api/boards/{board}/export/trello'
        status,data=pair(trello_url+'?fields=people&authToken=bad');assert status==200
        assert data['labels'] and all(not card['idLabels'] and card['due'] is None and card['desc']=='' for card in data['cards'])
        cases.append({'format':'trello','fields':'people','items':items,'actual':data})
        gitlab_url=f'/api/boards/{board}/export/gitlab'
        status,data=pair(gitlab_url+'?fields=comments&authToken=bad');assert status==200
        cases.append({'format':'gitlab','fields':'comments','items':items,'actual':data})
        status,data=pair(gitlab_url+'?authToken=bad');assert status==200
        cases.append({'format':'gitlab','fields':None,'items':items,'actual':data})
        assert snapshot()==before
        db.execute(f"CREATE TRIGGER issue_public AFTER UPDATE OF title ON kb_boards WHEN NEW.id={board} BEGIN UPDATE kb_board_visibility SET permission='private' WHERE board_id={board}; END");db.commit();before=snapshot()
        for target in [url,markdown_url,leo_url]:
            assert pair(target)==(403,{'error':'Forbidden'});assert snapshot()==before
        db.execute('DROP TRIGGER issue_public');db.commit()
        fixture('ImportExportPolicyFixture',{'WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":true}'})
        assert pair('/api/boards/99999999/export/github?authToken=bad')==(403,'Export is disabled by the administrator.')
        db.execute('ALTER TABLE kb_boards RENAME COLUMN id TO issue_hidden_id');db.commit();before=snapshot()
        for target in [url,markdown_url,leo_url]:
            assert pair(target+'?authToken=bad')==(403,'Export is disabled by the administrator.');assert snapshot()==before
        db.execute('ALTER TABLE kb_boards RENAME COLUMN issue_hidden_id TO id');db.commit()
        fixture('ImportExportPolicyFixture',{'WEBA_EXCHANGE_MODE':'save','WEBA_EXCHANGE_FLAGS':'{"import":false,"export":false}'})
        db.execute('ALTER TABLE kb_cards RENAME COLUMN labels TO opaque_export_canary');db.commit();before=snapshot()
        assert pair(url)==(500,{'error':'Board export failed'});assert snapshot()==before
        db.execute('ALTER TABLE kb_cards RENAME COLUMN opaque_export_canary TO labels');db.commit()
        db.execute('ALTER TABLE kb_cards RENAME COLUMN description TO opaque_markdown_canary');db.commit();before=snapshot()
        for target in [markdown_url,leo_url]:
            assert pair(target)==(500,{'error':'Board export failed'});assert snapshot()==before
        db.execute('ALTER TABLE kb_cards RENAME COLUMN opaque_markdown_canary TO description');db.commit()
    for sample in cases:
        sample.setdefault('board',source_board);sample.setdefault('lists',source_lists);sample.setdefault('swimlanes',source_swimlanes)
    Path(os.environ['WEBA_TEST_PROJECT'],'issue-export-cases.json').write_text(json.dumps(cases))
    Path(os.environ['WEBA_TEST_PROJECT'],'issue-export-roles.json').write_text(json.dumps(role_cases))
    print('Issue export HTTP: nine source routes, public/private/query-bearer auth precedence, field selections, archive reads, no writes, assigned-only/global-admin denial, all 256 raw role sets, late member/token/policy/public rollback and opaque failure passed')
try:main()
except Exception as error:
    message=traceback.format_exc()+"\nLast response: "+repr(last)
    for secret in secrets:message=message.replace(secret,'[redacted]')
    raise SystemExit(message) from None
