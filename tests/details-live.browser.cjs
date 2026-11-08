// Real native pages in separate contexts; all mutations use actual UI/REST paths.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP live details: original Playwright dependency unavailable; pane coverage remains unverified');return;}
 const {chromium,request,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS),board=String(fixture.otherBoardId),card=String(fixture.otherCardId);
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL});
 let browser,first,second;
 const pageErrors=[];
 const control=name=>`[id$=".${name}"]`,input=name=>`[id$=".${name}:entry"],textarea[id$=".${name}"]`;
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
 const fill=async(page,name,value)=>{await settle(page);await page.locator(input(name)).fill(value);};
 const kind=async(page,label)=>{await settle(page);await page.locator('[id$=".DetailKind:select"]').selectOption({label});await settle(page);};
 const row=async(page,text)=>{await page.locator(control('DetailTree')+' tr[id]').filter({hasText:text}).last().click();await settle(page);};
 async function login(username){const response=await api.post('/users/login',{data:{username,password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);const value=await response.json();secrets.push(value.token);return value;}
 try{
  const admin=await login('rest-owner'),headers={Authorization:'Bearer '+admin.token};
  for(const [name,role] of [['rest-other','admin'],['rest-member','normal']]){
   const response=await api.post(`/api/boards/${board}/members/${name}/add`,{headers,data:{action:'add',role}});expect(response.status()).toBe(200);
   expect((await api.post(`/api/boards/${board}/members/${name}`,{headers,data:{role}})).status()).toBe(200);
  }
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);
  first=await browser.newContext();second=await browser.newContext();
  async function open(context,username){const page=await context.newPage();page.on('pageerror',error=>pageErrors.push(error.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await fill(page,'WebTextName',username);await fill(page,'WebTextPass',process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');await page.locator(`[data-board-key="b${board}"]`).click();await settle(page);await page.locator(`.weba-report .weba-card[data-card-id="${card}"] .weba-card-menu`).click();await settle(page);await click(page,'ContextComments');return page;}
  const owner=await open(first,'rest-other'),member=await open(second,'rest-member');
  await fill(owner,'DetailBody','Unsaved owner comment');
  await fill(member,'DetailBody','External live comment');await click(member,'DetailSave');
  await expect(member.locator(control('DetailTree')),await member.locator(control('Notice')).innerText()).toContainText('External live comment');
  await owner.bringToFront();
  try{await expect(owner.locator(control('DetailTree'))).toContainText('External live comment');}catch(error){throw Error('Owner live notice: '+await owner.locator(control('Notice')).innerText(),{cause:error});}
  await expect(owner.locator(input('DetailBody'))).toHaveValue('Unsaved owner comment');
  await click(owner,'DetailSave');
  await member.bringToFront();
  await expect(member.locator(control('DetailTree'))).toContainText('Unsaved owner comment');
  await row(member,'Unsaved owner comment');
  await expect(member.locator(control('DetailSave'))).toBeHidden();
  await owner.bringToFront();
  await fill(owner,'DetailBody','Another live comment');await click(owner,'DetailSave');
  await member.bringToFront();
  await expect(member.locator(control('DetailTree'))).toContainText('Another live comment');
  await expect(member.locator(control('DetailSave'))).toBeHidden();
  await member.evaluate(()=>{gw.update(document.querySelector('[id$=".DetailBody"]').id,'text','Forged comment body');gw.raise(document.querySelector('[id$=".DetailSave"]').id,'click',[]);});await settle(member);
  await expect(member.locator(control('Notice'))).toContainText('Comment not editable');
  await expect(owner.locator(control('DetailTree'))).not.toContainText('Forged comment body');
  await kind(owner,'Checklists');await fill(owner,'DetailTitle','Live checklist');await click(owner,'DetailSave');
  await kind(owner,'Checklist items');await fill(owner,'DetailTitle','Live item');await click(owner,'DetailSave');
  await kind(member,'Checklist items');await row(owner,'Live item');await row(member,'Live item');
  await fill(owner,'DetailTitle','Local item draft');
  await member.locator(control('DetailDone')+' input').check();await settle(member);await click(member,'DetailSave');
  await owner.bringToFront();
  await expect(owner.locator(control('DetailTree'))).toContainText('[x] Live item');
  await expect(owner.locator(input('DetailTitle'))).toHaveValue('Local item draft');
  await expect(owner.locator(control('DetailDone')+' input')).toBeChecked();
  await click(owner,'DetailSave');
  await member.bringToFront();
  await expect(member.locator(control('DetailTree'))).toContainText('[x] Local item draft');
  await row(owner,'Local item draft');await fill(owner,'DetailTitle','Deleted item draft');
  await row(member,'Local item draft');await click(member,'DetailDelete');await owner.bringToFront();
  await expect(owner.locator(control('DetailTree'))).not.toContainText('Local item draft');
  await expect(owner.locator(input('DetailTitle'))).toHaveValue('');
  await expect(owner.locator(control('DetailDelete'))).toBeDisabled();
  await fill(owner,'DetailTitle','Pending item');
  await kind(member,'Checklists');await fill(member,'DetailTitle','Alternative checklist');await click(member,'DetailSave');
  await row(member,'Live checklist');await click(member,'DetailDelete');await owner.bringToFront();
  await expect(owner.locator(control('DetailTree'))).not.toContainText('Live checklist');
  await expect(owner.locator(input('DetailTitle'))).toHaveValue('Pending item');
  await expect(owner.locator('[id$=".DetailParent:select"]')).toHaveValue('');
  await click(owner,'DetailSave');await expect(owner.locator(control('Notice'))).toContainText('Choose a checklist');
  await expect(owner.locator(control('DetailTree'))).not.toContainText('Pending item');
  const alternative=await owner.locator('[id$=".DetailParent:select"] option').filter({hasText:'Alternative checklist'}).evaluate(option=>option.value);
  await owner.locator('[id$=".DetailParent:select"]').selectOption(alternative);await settle(owner);await click(owner,'DetailSave');
  await expect(owner.locator(control('DetailTree')),await owner.locator(control('Notice')).innerText()).toContainText('Pending item');
  await kind(member,'Checklist items');await expect(member.locator(control('DetailTree'))).toContainText('Pending item');
  await kind(owner,'Attachments');await kind(member,'Attachments');
  const chooser=owner.waitForEvent('filechooser');await click(owner,'DetailUpload');
  await(await chooser).setFiles({name:'live.bin',mimeType:'application/octet-stream',buffer:Buffer.from([0,1,2,255,10])});
  await expect(owner.locator(control('DetailTree'))).toContainText('live.bin');
  await member.bringToFront();await expect(member.locator(control('DetailTree'))).toContainText('live.bin');
  await row(member,'live.bin');await expect(member.locator(control('DetailDownload'))).toBeEnabled();
  await row(owner,'live.bin');await click(owner,'DetailDelete');await member.bringToFront();
  await expect(member.locator(control('DetailTree'))).not.toContainText('live.bin');
  await expect(member.locator(control('DetailDownload'))).toBeDisabled();
  await kind(owner,'Custom fields');await fill(owner,'DetailTitle','Live typed field');await fill(owner,'DetailBody','12');await click(owner,'DetailSave');
  await kind(member,'Custom fields');await row(owner,'Live typed field');await row(member,'Live typed field');
  await fill(owner,'DetailTitle','Typed title draft');
  await member.locator('[id$=".DetailType:select"]').selectOption({label:'checkbox'});await settle(member);
  await member.locator(control('DetailDone')+' input').check();await settle(member);await click(member,'DetailSave');await owner.bringToFront();
  await expect(owner.locator(control('DetailTree'))).toContainText('Live typed field: true');
  await expect(owner.locator(input('DetailTitle'))).toHaveValue('Typed title draft');
  await expect(owner.locator('[id$=".DetailType:select"]')).toHaveValue('checkbox');
  await click(owner,'DetailSave');await member.bringToFront();
  await expect(member.locator(control('DetailTree'))).toContainText('Typed title draft: true');
  await row(owner,'Typed title draft');await fill(owner,'DetailBody','Stale typed body');
  await row(member,'Typed title draft');await member.locator('[id$=".DetailType:select"]').selectOption({label:'number'});await settle(member);
  await fill(member,'DetailBody','45');await click(member,'DetailSave');await owner.bringToFront();
  await expect(owner.locator(control('DetailTree'))).toContainText('Typed title draft: 45');
  await expect(owner.locator(input('DetailBody'))).toHaveValue('Stale typed body');
  await click(owner,'DetailSave');await expect(owner.locator(control('Notice'))).toContainText('Field type changed');
  await expect(member.locator(control('DetailTree'))).toContainText('Typed title draft: 45');
  const readonly=await api.post(`/api/boards/${board}/members/rest-member`,{headers,data:{role:'readonly'}});expect(readonly.status()).toBe(200);
  await member.bringToFront();await expect(member.locator(control('DetailSave'))).toBeHidden();
  const scoped=await api.post(`/api/boards/${board}/members/rest-member`,{headers,data:{isAdmin:true,isReadAssignedOnly:true}});expect(scoped.status()).toBe(200);
  await expect(member.locator(control('DetailsPanel'))).toBeHidden();
  expect(pageErrors).toEqual([]);
  console.log('Live details browser: external comments/checklist changes, preserved drafts, selected clean fields, author/role/scope guards, deleted entries/parents, file metadata/removal and custom-type conflict safety passed');
 }finally{if(first)await first.close();if(second)await second.close();if(browser)await browser.close();await api.dispose();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
