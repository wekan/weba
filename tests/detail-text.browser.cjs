'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=extra=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',...extra}}));
 const seed=fixture({}),base={WEBA_NATIVE_BOARD:String(seed.board),WEBA_NATIVE_CARD:String(seed.items[0].card)};
 fixture({...base,WEBA_NATIVE_MODE:'copy-seed'});
 const read=()=>fixture({...base,WEBA_NATIVE_MODE:'copy-read'}),initial=read(),custom=initial.entries.find(e=>e.kind==='custom'),shown=t=>t.replaceAll('\0',''),c=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"],textarea[id$=".${n}"]`;
 let browser,context;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async n=>{await settle();await page.locator(c(n)).click();await settle();};
  await page.goto(process.env.WEBA_TEST_URL);await page.locator(input('WebTextName')).fill('rest-other');await page.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click('WebButtonLogin');await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
  await page.locator(`.weba-card[data-card-id="${seed.items[0].card}"] .weba-card-menu`).click();await click('ContextComments');
  async function kind(label){await settle();await page.locator('[id$=".DetailKind:select"]').selectOption({label});await settle();}
  async function row(text){await page.locator(c('DetailTree')+' tr[id]').filter({hasText:shown(text)}).last().click();await settle();}
  await kind('Custom fields');await row(custom.title);await expect(page.locator(input('DetailTitle'))).toHaveValue(custom.title);await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body);
  fixture({...base,WEBA_NATIVE_MODE:'detail-update',WEBA_NATIVE_SUFFIX:'B'});await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'B',{timeout:15000});
  const local=custom.title+' LOCAL';await page.locator(input('DetailTitle')).evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},local);await settle();
  fixture({...base,WEBA_NATIVE_MODE:'detail-update',WEBA_NATIVE_SUFFIX:'C'});await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'C',{timeout:15000});await expect(page.locator(input('DetailTitle'))).toHaveValue(local);
  await click('DetailSave');expect(read().entries.find(e=>e.kind==='custom')).toMatchObject({title:local,body:custom.body+'C'});
  await row(local);await expect(page.locator(input('DetailTitle'))).toHaveValue(local);await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'C');
  await click('DetailNew');await expect(page.locator(input('DetailTitle'))).toHaveValue('');await expect(page.locator(input('DetailBody'))).toHaveValue('');
  await kind('Comments');const comment=initial.entries.find(e=>e.kind==='comment');await row(comment.body);await expect(page.locator(input('DetailBody'))).toHaveValue(comment.body);await expect(page.locator(c('DetailTree'))).toContainText(shown(comment.author)+': '+shown(comment.body));
  await kind('Checklists');const checklist=initial.entries.find(e=>e.kind==='checklist');await row(checklist.title);await expect(page.locator(input('DetailTitle'))).toHaveValue(checklist.title);
  await kind('Attachments');await expect(page.locator(c('DetailTree'))).toContainText(shown(initial.files[0].filename));await expect(page.locator(c('DetailsPanel')+' tag')).toHaveCount(0);
  await page.reload();await page.locator(`.weba-card[data-card-id="${seed.items[0].card}"] .weba-card-menu`).click();await click('ContextComments');await kind('Custom fields');await row(local);await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'C');expect(errors).toEqual([]);
  console.log('Detail complete-text browser: native custom/comment/checklist/file text, exact encoded editor values, external suffix heartbeat, dirty local title with independent external body save, New clears stale values, literal markup and reload passed');
 }finally{if(context)await context.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
