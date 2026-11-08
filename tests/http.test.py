import urllib.request,urllib.parse,http.cookiejar,json,re,os,uuid
BASE=os.environ.get('WEBA_TEST_URL','http://127.0.0.1:8100')
username='http-'+uuid.uuid4().hex[:12]
jar=http.cookiejar.CookieJar(); client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def get(path='/'): return client.open(BASE+path,timeout=15).read().decode()
def command(c):
 data=urllib.parse.urlencode({'c':json.dumps(c)}).encode()
 request=urllib.request.Request(BASE+'/x',data=data,headers={
  'Content-Type':'application/x-www-form-urlencoded', 'X-WeBa-Request':'1'})
 return client.open(request,timeout=15).read().decode()
# Development routes must never expose the real CGI environment or mutate a
# session. Check the installed host with an actual Gambas project/archive.
for debug_path in ['/~dump', '/%7Edump', '/%257Edump', '/~logout']:
 try:
  get(debug_path)
 except urllib.error.HTTPError as error:
  assert error.code == 404
 else:
  raise AssertionError('Development route was exposed')
# The native form protocol must not accept cross-site form/image mutations.
for method,path,headers in [
 ('GET','/x?c=private',{}),
 ('POST','/x',{}),
 ('POST','/x',{'X-WeBa-Request':'1','Origin':'https://attacker.invalid'}),
 ('POST','/upload:invalid',{'Origin':'https://attacker.invalid'}),
]:
 req=urllib.request.Request(BASE+path,data=b'c=%5B%5D' if method=='POST' else None,
  method=method,headers={'Content-Type':'application/x-www-form-urlencoded',**headers})
 try:
  client.open(req,timeout=15)
 except urllib.error.HTTPError as error:
  assert error.code == (405 if method=='GET' else 403)
 else:
  raise AssertionError('Unsafe native request was accepted')
with client.open(BASE,timeout=15) as response:
 assert response.headers['X-Frame-Options'] == 'DENY'
 assert response.headers['Content-Security-Policy'] == "frame-ancestors 'none'"
 assert response.headers['Referrer-Policy'] == 'same-origin'
 assert response.headers['X-Content-Type-Options'] == 'nosniff'
page=get(); command(['raise',None,'open',[],False]); prefix=re.search(r'id="(@\d+)\.WebTextName"',page)[1]
answer=command(['raise',prefix+'.ShowPassword','click',[],False])
assert 'fa-eye-slash' in answer and 'Hide' in answer and 'text' in answer, 'Login password reveal failed'
answer=command(['raise',prefix+'.ShowPassword','click',[],False])
assert 'fa-eye' in answer and 'Show' in answer and 'password' in answer, 'Login password hide failed'
command(['raise',prefix+'.ShowRegistration','click',[],False])
for name,value in [('WebTextName',username),('WebTextPass','x'),('ConfirmPassword','different')]:
 answer=command(['update',prefix+'.'+name,'text',value,True])
answer=command(['raise',prefix+'.Register','click',[],False])
assert 'Passwords&nbsp;do&nbsp;not&nbsp;match' in answer
assert 'location.reload' not in answer
answer=command(['raise',prefix+'.ShowPassword','click',[],False])
assert 'WebTextPass' in answer and 'ConfirmPassword' not in answer and 'text' in answer
answer=command(['raise',prefix+'.ShowConfirmPassword','click',[],False])
assert 'ConfirmPassword' in answer and 'WebTextPass' not in answer and 'text' in answer
answer=command(['raise',prefix+'.ShowPassword','click',[],False])
assert 'WebTextPass' in answer and 'password' in answer
answer=command(['raise',prefix+'.ShowConfirmPassword','click',[],False])
assert 'ConfirmPassword' in answer and 'password' in answer
command(['update',prefix+'.ConfirmPassword','text','x',True])
assert 'location.reload' in command(['raise',prefix+'.Register','click',[],False])
page=get(); command(['raise',None,'open',[],False])
assert 'root.webaRender' in page, 'Custom reports must be included in the rendered page'
assert 'BoardTitle' in page
prefix=re.search(r'id="(@\d+)\.BoardTitle"',page)[1]
answer=command(['update',prefix+'.DragAction','text','card||||',True])
assert 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in answer or 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in get()
answer=command(['update',prefix+'.BoardAction','text','lane|||',True])
assert 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in answer or 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in get()
command(['update',prefix+'.BoardTitle','text','HTTP board',True])
answer=command(['raise',prefix+'.NewBoard','click',[],False])
key=next(k for k in re.findall(r'Boards:([A-Za-z0-9+/=]+)',answer) if k.startswith('Yj') and k.endswith('='))

answer=command(['update',prefix+'.Boards','$'+key,None,True])
assert 'Board&nbsp;not&nbsp;accessible' not in answer
assert re.search(r'data-view=.{0,2}Swimlanes', answer), 'Board must open in Swimlanes'
command(['raise',prefix+'.NewCard','click',[],False])
for name,value in [('CardTitle','HTTP card'),('Description','<script>user text</script>'),('DueDay','2026-11-06')]:
 command(['update',prefix+'.'+name,'text',value,True])
answer=command(['raise',prefix+'.SaveCard','click',[],False])
assert 'Card&nbsp;saved' in answer, answer
for control,view in [('Calendar','Calendar'),('Charts','Charts'),('TableView','Table'),('Swimlanes','Swimlanes')]:
 answer=command(['raise',prefix+'.'+control,'click',[],False])
 assert 'HTTP card' in answer and view in answer, answer
 assert '&lt;script&gt;' in answer
command(['raise',prefix+'.ArchiveBoard','click',[],False])
command(['raise',prefix+'.Archive','click',[],False])
command(['update',prefix+'.Boards','$'+key,None,True])
answer=command(['update',prefix+'.DragAction','text','card||||',True])
assert 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in answer or 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in get()
answer=command(['update',prefix+'.BoardAction','text','lane|||',True])
assert 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in answer or 'Select&nbsp;an&nbsp;active&nbsp;board&nbsp;first' in get(), 'Archived-board actions must be rejected server-side'
answer=command(['raise',prefix+'.Admin','click',[],False])
assert username in answer, 'Admin user listing did not contain the registered user'
assert '<td>Admin</td>' in answer, 'First registered user role was not Admin'
answer=command(['raise',prefix+'.PasswordLength','click',[],False])
assert 'PolicyEnforce' in answer and 'PolicyMinimum' in answer
command(['update',prefix+'.PolicyEnforce','value',True,True])
command(['update',prefix+'.PolicyMinimum','text','12',True])
answer=command(['raise',prefix+'.SavePasswordPolicy','click',[],False])
assert 'saved' in answer
assert 'Fullname' in command(['raise',prefix+'.Profile','click',[],False])
assert 'location.reload' in command(['raise',prefix+'.Logout','click',[],False])
page=get()
assert 'WebTextName' in page
command(['raise',None,'open',[],False])
prefix=re.search(r'id="(@\d+)\.WebTextName"',page)[1]
command(['raise',prefix+'.ShowRegistration','click',[],False])
for name,value in [('WebTextName',username+'-short'),('WebTextPass','x'),('ConfirmPassword','x')]:
 command(['update',prefix+'.'+name,'text',value,True])
answer=command(['raise',prefix+'.Register','click',[],False])
assert '12' in answer and 'least' in answer, 'Saved admin policy must apply to a new session'
assert 'unique' not in answer, 'Length errors must not accuse a duplicate username'
for name,value in [('WebTextName',username),('WebTextPass','long enough password'),('ConfirmPassword','long enough password')]:
 command(['update',prefix+'.'+name,'text',value,True])
answer=command(['raise',prefix+'.Register','click',[],False])
assert 'Username&nbsp;already&nbsp;exists' in answer, 'Duplicate username must have a specific explanation'
print('HTTP registration/login, board/card creation, report resources, views, profile, admin and logout passed')
