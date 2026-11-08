const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{url:'http://localhost:8080/',runScripts:'outside-only'});
const {window}=dom;
class XHR {
  constructor(){this.headers={};}
  open(method,url,...options){this.method=method;this.url=url;this.options=options;}
  setRequestHeader(name,value){this.headers[name]=value;}
  send(body){this.body=body;}
}
window.XMLHttpRequest=XHR;
window.eval(fs.readFileSync(path.join(__dirname,'../WeKan/.public/ui.js'),'utf8'));
const command=['update','@1.WebTextPass','text','private & + unicode ä',true];
const request=new window.XMLHttpRequest();
request.open('GET','/x?c='+encodeURIComponent(JSON.stringify(command)),true);request.send(null);
assert.equal(request.method,'POST');
assert.equal(request.url,'http://localhost:8080/x');
assert.equal(request.headers['X-WeBa-Request'],'1');
assert.equal(request.headers['Content-Type'],'application/x-www-form-urlencoded;charset=UTF-8');
assert.deepEqual(JSON.parse(new URLSearchParams(request.body).get('c')),command);
assert.ok(!request.url.includes('private'));
const upload=new window.XMLHttpRequest();const form=new window.FormData();form.append('file','bytes');
upload.open('POST','/upload:123',true);upload.send(form);
assert.equal(upload.headers['X-WeBa-Request'],'1');assert.equal(upload.body,form);
assert.equal(upload.headers['Content-Type'],undefined,'browser must supply the multipart boundary');
for(const url of ['https://attacker.invalid/x?c=private','/i18n/fi.json']){
 const other=new window.XMLHttpRequest();other.open('GET',url);other.send();
 assert.equal(other.method,'GET');assert.equal(other.url,url);assert.deepEqual(other.headers,{});
}
// Reusing an XHR must not carry native form bodies/headers into unrelated calls.
request.headers={};request.open('GET','https://attacker.invalid/x');request.send();
assert.equal(request.body,undefined);assert.deepEqual(request.headers,{});
(async()=>{
 const button=window.document.createElement('button');button.className='gw-button';window.document.body.append(button);
 window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
 const settle=()=>new Promise(resolve=>window.setTimeout(resolve,0));
 await settle();assert.equal(button.disabled,false);
 button.classList.add('gw-disabled');await settle();
 assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-disabled'),'true');
 button.classList.remove('gw-disabled');await settle();
 assert.equal(button.disabled,false);assert.equal(button.getAttribute('aria-disabled'),'false');
 window.close();console.log('Native transport: POST payload privacy, same-origin header, multipart upload and unrelated/reused XHR boundaries passed');
})().catch(error=>{window.close();console.error(error);process.exitCode=1;});
