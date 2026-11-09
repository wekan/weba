// Real browser downloads cannot execute stored HTML; every retained read rechecks scope.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original Playwright required');
 const {chromium,request,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test'),f=JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}})),target=Object.fromEntries(['boardId','swimlaneId','listId','cardId'].map(k=>[k,String(f[k])]));
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL}),browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 try{
  async function login(name){const response=await api.post('/users/login',{data:{username:name,password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);const t=(await response.json()).token;secrets.push(t);return t;}
  const owner=await login('rest-other'),reader=await login('rest-file-reader'),assigned=await login('rest-file-assigned');
  const name='HTML résumé 🚀.html',bytes=Buffer.from('<!doctype html><script>window.__rawAttachmentRan=1;document.body.innerHTML="EXECUTED";</script><p>downloaded only</p>');
  const upload=await api.post('/api/attachment/upload',{headers:{Authorization:'Bearer '+owner},data:{...target,fileName:name,fileType:'text/html',fileData:bytes.toString('base64')}});expect(upload.status()).toBe(200);const file=(await upload.json()).attachmentId;
  const context=await browser.newContext({acceptDownloads:true});contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>window.__rawAttachmentRan=0);await context.setExtraHTTPHeaders({Authorization:'Bearer '+reader});
  async function json(p,url){return p.evaluate(async route=>{const r=await fetch(route);return{status:r.status,data:await r.json()};},url);}
  expect((await json(page,'/api/attachment/info/'+file)).status).toBe(200);
  async function download(){const waiting=page.waitForEvent('download');try{await page.goto(process.env.WEBA_TEST_URL+'/api/attachment/download/'+file+'?raw=1');}catch(error){if(!/ERR_ABORTED|Download is starting/.test(String(error)))throw error;}const d=await waiting;expect(d.suggestedFilename()).toBe(name);const stream=await d.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);expect(Buffer.concat(chunks)).toEqual(bytes);expect(await page.evaluate(()=>window.__rawAttachmentRan)).toBe(0);}
  await download();
  expect((await api.delete('/api/attachment/delete/'+file,{headers:{Authorization:'Bearer '+owner}})).status()).toBe(200);
  const listing=await json(page,'/api/attachment/list/'+f.boardId);expect(listing.status).toBe(200);expect(listing.data.attachments.map(x=>x.attachmentId)).not.toContain(file);await download();
  const scoped=await browser.newContext({extraHTTPHeaders:{Authorization:'Bearer '+assigned}});contexts.push(scoped);const scopedPage=await scoped.newPage();await scopedPage.goto(process.env.WEBA_TEST_URL);expect((await json(scopedPage,'/api/attachment/info/'+file)).status).toBe(200);
  expect((await api.put(`/api/boards/${f.boardId}/lists/${f.listId}/cards/${f.cardId}`,{headers:{Authorization:'Bearer '+owner},data:{assignees:[]}})).status()).toBe(200);
  const denied=await json(scopedPage,'/api/attachment/download/'+file+'?raw=1');expect(denied).toEqual({status:403,data:{success:false,error:'You do not have permission to access this attachment'}});
  expect((await api.post(`/api/boards/${f.boardId}/members/rest-file-reader/remove`,{headers:{Authorization:'Bearer '+owner},data:{action:'remove'}})).status()).toBe(200);
  expect((await json(page,'/api/attachment/info/'+file)).status).toBe(403);expect((await json(page,'/api/attachment/list/'+f.boardId)).status).toBe(403);expect(await page.evaluate(()=>window.__rawAttachmentRan)).toBe(0);expect(errors).toEqual([]);
  console.log('Attachment reads browser: stored HTML forces exact Unicode-named download without script execution, live lists hide deletion while authorized retained download works, assignment/member revocation refuses reads in active browser contexts passed');
 }finally{for(const c of contexts)await c.close();await browser.close();await api.dispose();}
})().catch(error=>{let message=String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
