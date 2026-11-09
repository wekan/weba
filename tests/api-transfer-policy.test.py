"""Real persisted policy governs authenticated raw/JSON upload/download requests."""
import base64,json,os,sqlite3,subprocess,urllib.error,urllib.parse,urllib.request
from pathlib import Path
base=os.environ['WEBA_TEST_URL']
def fixture(mode,settings=None,user='rest-owner'):
    return json.loads(subprocess.check_output([os.environ['GBX'],'-s','TransferPolicyFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0','WEBA_TRANSFER_MODE':mode,'WEBA_TRANSFER_USER':user,'WEBA_TRANSFER_DATA':json.dumps(settings or {})}))
def call(route,method='GET',token=None,data=None,raw=False,mime='application/json'):
    payload=data if isinstance(data,bytes) else json.dumps(data).encode() if data is not None else None
    request=urllib.request.Request(base+route,method=method,headers={'Content-Type':mime,**({'Authorization':'Bearer '+token} if token else {})},data=payload)
    try: response=urllib.request.urlopen(request,timeout=20)
    except urllib.error.HTTPError as error: response=error
    with response:return response.status,response.read() if raw else json.loads(response.read())
def login(name):
    status,data=call('/users/login','POST',data={'username':name,'password':os.environ['WEBA_TEST_PASSWORD']});assert status==200
    return data['token']
def defaults():return {**{k+'MaxBytes':0 for k in ('attachmentsUpload','attachmentsDownload','apiUpload','apiDownload')},**{k+'Blocked':False for k in ('attachmentsUpload','attachmentsDownload','apiUpload','apiDownload','avatarsUpload')}}
f=json.loads(subprocess.check_output([os.environ['GBX'],'-s','AttachmentFixture',os.environ['WEBA_TEST_PROJECT']],text=True,env={**os.environ,'WEBA_API_REQUEST':'0'}));owner=login('rest-other');admin=login('rest-owner');target={k:str(f[k]) for k in ('boardId','swimlaneId','listId','cardId')};file=str(f['fileId'])
def upload(content,raw=False):
    if raw:return call('/api/attachment/upload?'+urllib.parse.urlencode({**target,'fileName':'policy.bin'}),'POST',owner,content,mime='application/octet-stream')
    return call('/api/attachment/upload','POST',owner,{**target,'fileName':'policy.bin','fileData':base64.b64encode(content).decode() or '!!!!'})
try:
    initial=fixture('raw');assert initial['effectiveApiUpload']==1024 and initial['effectiveApiDownload']==512,initial
    data=defaults();data['apiUploadBlocked']=True;data['apiDownloadBlocked']=True;fixture('save',data)
    with sqlite3.connect(Path(os.environ['WEBA_DB_HOST'])/os.environ['WEBA_DB_NAME']) as db:
        tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'")]
        def snapshot():return {t:sorted(db.execute('SELECT * FROM '+t).fetchall(),key=repr) for t in tables}
        before=snapshot()
        for raw in (False,True):assert upload(b'x',raw)==(403,{'success':False,'error':'API uploads are disabled by administrator'})
        for ref in (file,'999999'):
            for suffix in ('','?raw=1'):assert call('/api/attachment/download/'+ref+suffix,token=owner)==(403,{'success':False,'error':'API downloads are disabled by administrator'})
        for endpoint in ('info/'+file,'list/'+str(f['boardId'])):assert call('/api/attachment/'+endpoint,token=owner)[0]==200
        assert snapshot()==before
        # Native blocks are independent of API controls; explicit zero overrides env.
        data=defaults();data['attachmentsUploadBlocked']=True;data['attachmentsDownloadBlocked']=True;fixture('save',data)
        assert fixture('raw')['effectiveApiUpload']==67108864
        assert upload(b'x'*1025)[0]==200
        assert call('/api/attachment/download/'+file,token=owner)[0]==200
        data['apiUploadMaxBytes']=2;data['apiDownloadMaxBytes']=2;fixture('save',data)
        before=snapshot();assert upload(b'abc')[0]==413;assert snapshot()==before
        for suffix in ('','?raw=1'):assert call('/api/attachment/download/'+file+suffix,token=owner)==(413,{'success':False,'error':'Attachment exceeds API download limit'})
        assert upload(b'ab')[0]==200
        # Decimal configured byte limits compare exact byte counts, not rounded ints.
        data['apiUploadMaxBytes']=0.5;data['apiDownloadMaxBytes']=0.5;fixture('save',data)
        before=snapshot();assert upload(b'a')[0]==413;assert snapshot()==before
        assert upload(b'')[0]==200
        data=defaults();fixture('save',data)
        db.execute("CREATE TRIGGER policy_late_block AFTER INSERT ON kb_attachment_data BEGIN UPDATE attachment_transfer_settings SET apiUploadBlocked=1 WHERE id=1; END");db.commit()
        before=snapshot();policy=db.execute('SELECT * FROM attachment_transfer_settings').fetchall()
        assert upload(b'x')==(403,{'success':False,'error':'API uploads are disabled by administrator'})
        assert snapshot()==before and db.execute('SELECT * FROM attachment_transfer_settings').fetchall()==policy
        db.execute('DROP TRIGGER policy_late_block');db.commit()
        db.execute("CREATE TRIGGER policy_late_size AFTER INSERT ON kb_attachment_data BEGIN UPDATE attachment_transfer_settings SET apiUploadMaxBytes=1 WHERE id=1; END");db.commit()
        before=snapshot();assert upload(b'xx')==(413,{'success':False,'error':'Attachment exceeds API upload limit'});assert snapshot()==before
        db.execute('DROP TRIGGER policy_late_size');db.commit()
    print('Transfer policy HTTP: persisted block/size/unlimited/env precedence, native/API independence, JSON/raw variants, metadata access, fractional byte limits and late block/limit atomic rollback passed')
finally:fixture('reset')
