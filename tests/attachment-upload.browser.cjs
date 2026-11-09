// Native panes consume real bearer uploads; retained IDs grant no scope after revocation.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original Playwright required');
 const {chromium,request,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const f=JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}})),target=Object.fromEntries(['boardId','swimlaneId','listId','cardId'].map(k=>[k,String(f[k])])),bytes=Buffer.from([0,255,1,127,226,152,131]);
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL}),browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 const control=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(control(n)).click();await settle(p);};
 try{
  async function token(name){const response=await api.post('/users/login',{data:{username:name,password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);return(await response.json()).token;}
  const ownerToken=await token('rest-other'),assignedToken=await token('rest-file-assigned');
  async function open(name){const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.waitForFunction(()=>window.webaI18n);await p.evaluate(()=>webaI18n.setLanguage('en'));await p.locator(input('WebTextName')).fill(name);await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await p.locator(`[data-board-key="b${f.boardId}"]`).click();await settle(p);await p.locator(`.weba-card[data-card-id="${f.cardId}"] .weba-card-menu`).click();await settle(p);await click(p,'ContextAttachments');return p;}
  const owner=await open('rest-other'),assigned=await open('rest-file-assigned');
  const name='API + native 🚀.bin',upload=await api.post('/api/attachment/upload',{headers:{Authorization:'Bearer '+assignedToken},data:{...target,fileName:name,fileType:'application/x-test-binary',fileData:bytes.toString('base64')}});expect(upload.status()).toBe(200);const uploaded=await upload.json();
  for(const p of [owner,assigned]){await p.bringToFront();await expect(p.locator(control('DetailTree'))).toContainText(name);}
  await assigned.locator(control('DetailTree')+' tr[id]').filter({hasText:name}).click();await settle(assigned);
  const downloadPromise=assigned.waitForEvent('download');await click(assigned,'DetailDownload');const download=await downloadPromise;expect(download.suggestedFilename()).toBe(name);const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(Buffer.concat(chunks)).toEqual(bytes);
  const changed=await api.put(`/api/boards/${f.boardId}/lists/${f.listId}/cards/${f.cardId}`,{headers:{Authorization:'Bearer '+ownerToken},data:{assignees:[]}});expect(changed.status()).toBe(200);
  await assigned.bringToFront();await expect(assigned.locator(control('DetailsPanel'))).toBeHidden();await expect(assigned.locator(`.weba-card[data-card-id="${f.cardId}"]`)).toHaveCount(0);
  const denied=await api.post('/api/attachment/upload',{headers:{Authorization:'Bearer '+assignedToken},data:{...target,fileName:'stale.bin',fileData:'eA=='}});expect(denied.status()).toBe(403);expect(await denied.json()).toEqual({success:false,error:'You do not have permission to modify this card'});
  await owner.bringToFront();await expect(owner.locator(control('DetailTree'))).not.toContainText('stale.bin');expect(errors).toEqual([]);
  console.log('Native upload browser: bearer-assigned upload updates two real panes, literal Unicode name/exact binary native download, assignment revocation clears stale pane and refuses retained-target upload passed');
 }finally{for(const c of contexts)await c.close();await browser.close();await api.dispose();}
})().catch(error=>{console.error(String(error).replaceAll(process.env.WEBA_TEST_PASSWORD,'[redacted]'));process.exitCode=1;});
