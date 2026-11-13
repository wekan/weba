"""Lossless upload validation and exact shared-prefix target identity over HTTP."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import urllib.error
import urllib.request

base = os.environ['WEBA_TEST_URL']
root = Path(__file__).resolve().parent

def native(mode='', **extra):
    env = {**os.environ, 'WEBA_API_REQUEST': '0', 'WEBA_NATIVE_MODE': mode, **extra}
    return json.loads(subprocess.check_output([env['GBX'], '-s', 'NativeTextFixture', env['WEBA_TEST_PROJECT']], env=env))

seed = native()
board = seed['board']
card = seed['items'][0]['card']
list_id = seed['items'][0]['list']
for letter, item in zip('AB', seed['items']):
    assert item['lane'] == "Lane\0Ω😀'<tag>"+letter
    assert item['title'] == "List\0Ω😀'<tag>"+letter
native('copy-seed', WEBA_NATIVE_BOARD=str(board), WEBA_NATIVE_CARD=str(card))


def call(route, token=None, method='GET', data=None):
    request = urllib.request.Request(base+route, method=method,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer '+token} if token else {})},
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read()
        assert response.headers.get_content_type() == 'application/json'
        assert response.headers.get('Cache-Control') == 'no-store'
        value = json.loads(raw.decode('utf-8'))
        return response.status, value, raw


def login(name):
    status, data, _ = call('/users/login', method='POST', data={'username': name, 'password': os.environ['WEBA_TEST_PASSWORD']})
    assert status == 200
    return data['token']

owner, admin, reader, assigned, outsider = (login(name) for name in ('rest-other', 'rest-owner', 'rest-native-reader', 'rest-native-assigned', 'rest-member'))
prefix = f'/api/boards/{board}'
scoped = prefix+f'/lists/{list_id}/cards/{card}'
listed = prefix+f'/lists/{list_id}/cards'
routes = [prefix, prefix+'/lists', prefix+'/swimlanes', listed, scoped, f'/api/cards/{card}']
suffix = "\0Ω😀'<tag>tail"
import base64
import urllib.parse
with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
    db.text_factory=lambda value:value.decode('utf-8','surrogatepass')
    def frame():
        tables=[name for name, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        return {name:sorted(db.execute('SELECT * FROM "'+name.replace('"','""')+'"').fetchall(),key=repr) for name in tables}
    lane=db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?',(board,seed['items'][0]['lane'])).fetchone()[0]
    other_lane=db.execute('SELECT id FROM kb_lanes WHERE board_id=? AND title=?',(board,seed['items'][1]['lane'])).fetchone()[0]
    target={'boardId':str(board),'swimlaneId':str(lane),'listId':str(list_id),'cardId':str(card),'fileName':"literal Ω😀'<tag>.bin",'fileType':'application/octet-stream'}
    binary=bytes(range(256))+b'\0\xfftail'
    def upload(change=None,token=owner,raw=False):
        payload={**target,**(change or {})}
        if not raw:return call('/api/attachment/upload',token,'POST',{**payload,'fileData':base64.b64encode(binary).decode()})
        request=urllib.request.Request(base+'/api/attachment/upload?'+urllib.parse.urlencode(payload),data=binary,headers={'Content-Type':'application/octet-stream','Authorization':'Bearer '+token},method='POST')
        try:response=urllib.request.urlopen(request,timeout=15)
        except urllib.error.HTTPError as error:response=error
        with response:
            body=response.read();return response.status,json.loads(body),body
    for raw in (False,True):
        status,value,_=upload(raw=raw)
        assert status==200 and value['success'] is True and value['fileName']==target['fileName'],(raw,status,value)
        assert db.execute('SELECT content FROM kb_files WHERE id=?',(value['attachmentId'],)).fetchone()[0]==binary
        for change in ({'fileName':'probe\0.bin'},{'fileType':'text/plain\0'},*({key:target[key]+'\0'} for key in ('boardId','swimlaneId','listId','cardId')),{'swimlaneId':str(other_lane)}):
            before=frame();status,value,_=upload(change,raw=raw)
            assert status==400 and value['success'] is False,(raw,change,status,value)
            assert frame()==before
    status,value,_=upload({'fileType':None})
    assert status==200
    assert db.execute('SELECT mime FROM kb_attachment_data WHERE file_id=?',(value['attachmentId'],)).fetchone()[0]=='application/octet-stream'
    for token in (reader,assigned,outsider):
        before=frame();assert upload(token=token)[0]==403;assert frame()==before
    assert call(prefix+'/members/rest-native-assigned',admin,'POST',{'role':'normalAssignedOnly'})[0]==200
    for label,token in (('assigned writer',assigned),('global admin',admin)):
        status,value,_=upload(token=token)
        assert status==200,(label,status,value)
    for name,effect,status in (
        ('sql',"SELECT RAISE(ABORT,'private upload canary');",500),
        ('lane',f"UPDATE kb_cards SET lane=CAST(x'{seed['items'][1]['lane'].encode().hex()}' AS TEXT) WHERE id={card};",400)):
        db.execute('CREATE TRIGGER upload_text_fail AFTER INSERT ON kb_attachment_data BEGIN '+effect+' END');db.commit()
        before=frame();actual,value,body=upload()
        assert actual==status and b'private upload canary' not in body,(name,actual,value)
        assert frame()==before
        db.execute('DROP TRIGGER upload_text_fail');db.commit()
        assert upload()[0]==200
    # Keep the existing 96-MiB request envelope, even above the backup decoder default.
    envelope=json.dumps({**target,'fileData':'QQ==','padding':'x'*(20971520+1)}).encode()
    request=urllib.request.Request(base+'/api/attachment/upload',data=envelope,method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+owner})
    with urllib.request.urlopen(request,timeout=60) as response:
        value=json.loads(response.read());assert response.status==200 and value['fileSize']==1
print('Upload complete text: raw/JSON exact shared-prefix lane targets, Unicode literal filename/binary bytes, NUL filename/MIME/all-ID refusal, wrong-suffix lane denial, reader/foreign/assigned/global scopes and SQL/late-suffix-lane full rollback/retry passed')
