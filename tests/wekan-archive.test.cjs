// Run the original archive HTTP callbacks unchanged with explicit SQLite fixtures.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let root=process.env.WEKAN_SOURCE&&path.resolve(process.env.WEKAN_SOURCE);
 if(!root){
  let ancestor=path.resolve(__dirname,'..');
  while(path.dirname(ancestor)!==ancestor){
   if(fs.existsSync(path.join(ancestor,'tests/playwright/specs/rest-card-archive.e2e.js'))){root=ancestor;break;}
   ancestor=path.dirname(ancestor);
  }
 }
 if(!root){console.log('SKIP original archive spec: source unavailable; parity remains unverified');return;}
 const spec=path.join(root,'tests/playwright/specs/rest-card-archive.e2e.js');
 const playwright=createRequire(spec)('@playwright/test');
 const cases=[];
 const test=(title,callback)=>cases.push({title,callback});
 const oracle=(operation,...args)=>JSON.parse(execFileSync(process.env.PYTHON||'python3',[
  path.join(__dirname,'wekan-archive-oracle.py'),operation,...args.map(value=>JSON.stringify(value))],{encoding:'utf8'}));
 const db={findOne:(...args)=>oracle('find-one',...args),find:(...args)=>oracle('find',...args),
  seedBoard:options=>oracle('seed',options),updateOne:(...args)=>oracle('update',...args),
  cleanup:options=>oracle('cleanup',options),uid:prefix=>prefix+'-nonexistent-card'};
 vm.runInNewContext(fs.readFileSync(spec,'utf8'),{require:name=>{
  if(name==='../fixtures')return{test,expect:playwright.expect};
  if(name==='../helpers/db')return db;
  throw Error('Unsupported dependency '+name);
 }},{filename:spec});
 const selected=cases.filter(({title})=>title.endsWith('returns JSON 404 for missing, incorrectly scoped and wrong-state cards without writes'));
 playwright.expect(cases.length).toBe(3);playwright.expect(selected.length).toBe(2);
 const request=await playwright.request.newContext({baseURL:process.env.WEBA_TEST_URL});
 let saved,browser,context;
 try{
  const response=await request.post('/users/login',{data:{username:'rest-other',password:process.env.WEBA_TEST_PASSWORD}});
  playwright.expect(response.status()).toBe(200);
  const user=await response.json();secrets.push(user.token);
  saved=oracle('prepare');
  for(const {title,callback} of selected){
   await callback({request,user,board:{boardId:saved.boardId,listIds:saved.listIds}});
   console.log('Original archive spec passed: '+title);
  }
  if(process.env.WEBA_ARCHIVE_LIVE==='1'){
   playwright.expect(process.env.WEBA_BROWSER_URL).toBeTruthy();
   oracle('update','cards',{_id:String(saved.cardId)},{$set:{archived:false}});
   const second=await request.post('/users/login',{data:{username:'rest-member',password:process.env.WEBA_TEST_PASSWORD}});
   playwright.expect(second.status()).toBe(200);
   const user2=await second.json();secrets.push(user2.token);
   browser=await playwright.chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);
   context=await browser.newContext();
   const page=await context.newPage();
   page.on('pageerror',error=>{throw error;});
   await page.goto(process.env.WEBA_TEST_URL);
   await page.locator('[id$=".WebTextName:entry"]').fill('rest-other');
   await page.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);
   await page.locator('[id$=".WebButtonLogin"]').click();
   await page.locator(`[data-board-key="b${saved.boardId}"]`).click();
   await page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'}).locator('strong').click();
   await page.locator('[id$=".CardTitle:entry"]').fill('Unsaved live draft');
   const cardPath=`/api/boards/${saved.boardId}/lists/${saved.listIds[0]}/cards/${saved.cardId}`;
   const edit=await request.put(cardPath,{headers:{Authorization:'Bearer '+user.token},data:{description:'Live description change'}});
   playwright.expect(edit.status()).toBe(200);
   await playwright.expect(page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'})).toContainText('Live description change');
   await playwright.expect(page.locator('[id$=".CardTitle:entry"]')).toHaveValue('Unsaved live draft');
   await page.locator('[id$=".SaveCard"]').click();
   await page.waitForFunction(()=>window.gw&&gw.commands.length===0);
   const retained=await request.get('/api/cards/'+saved.cardId,{headers:{Authorization:'Bearer '+user.token}});
   playwright.expect(retained.status()).toBe(200);
   const retainedCard=await retained.json();
   playwright.expect(retainedCard.title).toBe('Unsaved live draft');
   playwright.expect(retainedCard.description).toBe('Live description change');
   await playwright.expect(page.locator('[id$=".Description:entry"]')).toHaveValue('Live description change');
   await page.locator('[id$=".CardTitle:entry"]').fill('Alpha Card');
   await page.locator('[id$=".SaveCard"]').click();
   await page.waitForFunction(()=>window.gw&&gw.commands.length===0);
   await page.locator('[id$=".CloseEditor"]').click();
   await page.waitForFunction(()=>window.gw&&gw.commands.length===0);
   await page.evaluate(()=>{window.__liveCard=document.querySelector('.minicard-wrapper');});
   for(let tick=0;tick<2;tick++)await page.waitForResponse(response=>new URL(response.url()).pathname==='/x'&&(response.request().postData()||'').includes('BoardPoll'));
   playwright.expect(await page.evaluate(()=>window.__liveCard===document.querySelector('.minicard-wrapper'))).toBe(true);
   console.log('Live board: external description updates preserve unsaved native input; unchanged timer ticks preserve card DOM');
   const live=cases.find(({title})=>title.startsWith('REST archive and restore persist and update the board'));
   playwright.expect(live).toBeTruthy();
   // Real Playwright page, real Gambas DOM and original assertions: no refresh,
   // locator remapping, synthetic page or altered callback.
   await live.callback({boardPage:page,request,user,user2,board:{boardId:saved.boardId,listIds:saved.listIds}});
   console.log('Original archive spec passed: '+live.title);
   console.log('Original archive spec: 3/3 unchanged callbacks passed, including live native board updates');
   // Exercise revocation after the unchanged original callback has completed.
   await page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'}).locator('strong').click();
   await page.locator('[id$=".CardMembersButton"]').click();
   await playwright.expect(page.locator('[id$=".CardPeoplePanel"]')).toBeVisible();
   const adminResponse=await request.post('/users/login',{data:{username:'rest-owner',password:process.env.WEBA_TEST_PASSWORD}});
   playwright.expect(adminResponse.status()).toBe(200);
   const admin=await adminResponse.json();secrets.push(admin.token);
   const adminHeaders={Authorization:'Bearer '+admin.token};
   const scope=await request.post(`/api/boards/${saved.boardId}/members/${user.id}`,{headers:adminHeaders,data:{isAdmin:true,isReadAssignedOnly:true}});
   playwright.expect(scope.status()).toBe(200);
   const unassign=await request.put(cardPath,{headers:adminHeaders,data:{assignees:['rest-owner']}});
   playwright.expect(unassign.status()).toBe(200);
   await playwright.expect(page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'})).toHaveCount(0);
   await playwright.expect(page.locator('[id$=".Editor"]')).toBeHidden();
   await playwright.expect(page.locator('[id$=".CardTitle:entry"]')).toHaveValue('');
   await playwright.expect(page.locator('[id$=".CardPeoplePanel"]')).toBeHidden();
   const unrestricted=await request.post(`/api/boards/${saved.boardId}/members/${user.id}`,{headers:adminHeaders,data:{isAdmin:true}});
   playwright.expect(unrestricted.status()).toBe(200);
   await playwright.expect(page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'})).toBeVisible();
   await page.locator('.minicard-wrapper').filter({hasText:'Alpha Card'}).locator('strong').click();
   await playwright.expect(page.locator('[id$=".Editor"]')).toBeVisible();
   const addAdmin=await request.post(`/api/boards/${saved.boardId}/members/${admin.id}/add`,{headers:adminHeaders,data:{action:'add',role:'admin'}});
   playwright.expect(addAdmin.status()).toBe(200);
   const revoke=await request.post(`/api/boards/${saved.boardId}/members/${user.id}/remove`,{headers:adminHeaders,data:{action:'remove'}});
   playwright.expect(revoke.status()).toBe(200);
   await playwright.expect(page.locator('.weba-content')).toHaveAttribute('data-board','0');
   await playwright.expect(page.locator('[id$=".Editor"]')).toBeHidden();
   await playwright.expect(page.locator('[id$=".CardTitle:entry"]')).toHaveValue('');
   await playwright.expect(page.locator(`[data-board-key="b${saved.boardId}"]`)).toHaveCount(0);
   console.log('Live board privacy: assignment loss closes editor/people panels; board revocation removes the open board without navigation');

  }else console.log('Original archive spec: 2/3 unchanged callbacks passed; live board UI callback not requested in this HTTP-only run');
 }finally{if(context)await context.close();if(browser)await browser.close();if(saved)oracle('restore',saved);await request.dispose();}
})().catch(error=>{
 let message=error.stack||String(error);
 for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');
 console.error(message);process.exitCode=1;
});
