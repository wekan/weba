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
  await page.goto(process.env.WEBA_TEST_URL);await page.locator(input('WebTextName')).fill('rest-other');await page.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click('WebButtonLogin');await expect(page.locator('.weba-content')).toBeVisible();await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);await expect(page.locator('.weba-content')).toHaveAttribute('data-board',String(seed.board));
  await page.locator(`.weba-card[data-card-id="${seed.items[0].card}"] .weba-card-menu`).click();await click('ContextComments');
  async function kind(label){await settle();await page.locator('[id$=".DetailKind:select"]').selectOption({label});await settle();}
  async function row(text){await page.locator(c('DetailTree')+' tr[id]').filter({hasText:shown(text)}).last().click();await settle();}
  await kind('Custom fields');await row(custom.title);await expect(page.locator(input('DetailTitle'))).toHaveValue(custom.title);await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body);
  fixture({...base,WEBA_NATIVE_MODE:'detail-update',WEBA_NATIVE_SUFFIX:'B'});await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'B',{timeout:15000});
  const local=custom.title+' LOCAL';await page.locator(input('DetailTitle')).evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},local);await settle();
  fixture({...base,WEBA_NATIVE_MODE:'detail-update',WEBA_NATIVE_SUFFIX:'C'});await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'C',{timeout:15000});await expect(page.locator(input('DetailTitle'))).toHaveValue(local);
  await click('DetailSave');expect(read().entries.find(e=>e.kind==='custom')).toMatchObject({title:local,body:custom.body+'C'});
  await row(local);await expect(page.locator(input('DetailTitle'))).toHaveValue(local);await expect(page.locator(input('DetailBody'))).toHaveValue(custom.body+'C');
  const database=path.join(process.env.WEBA_DB_HOST,process.env.WEBA_DB_NAME);
  const sql=statement=>execFileSync('python3',['-c',`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as d:
 if len(sys.argv)>2:d.executescript(sys.argv[2])
 else:
  names=[r[0] for r in d.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%' ORDER BY name")]
  print(repr({n:sorted(d.execute('SELECT * FROM "'+n+'"').fetchall(),key=repr) for n in names}))
`,database,...(statement?[statement]:[])],{encoding:'utf8'});
  const pending=custom.body+'C pending final scope';
  await page.locator(input('DetailBody')).evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},pending);await settle();
  const beforeFinalSave=sql();sql('CREATE TRIGGER detail_save_final AFTER INSERT ON kb_history BEGIN UPDATE kb_cards SET archived=1 WHERE id='+seed.items[0].card+'; END');
  try{
   await click('DetailSave');await expect(page.locator(c('Notice'))).toContainText('Card archive state changed');
   await expect(page.locator(input('DetailTitle'))).toHaveValue(local);await expect(page.locator(input('DetailBody'))).toHaveValue(pending);
   expect(sql()).toBe(beforeFinalSave);
  }finally{sql('DROP TRIGGER detail_save_final');}
  const retryBody=custom.body+'C RETRY';
  await page.locator(input('DetailBody')).evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},retryBody);
  await click('DetailSave');expect(read().entries.find(e=>e.kind==='custom')).toMatchObject({title:local,body:retryBody});
  await click('DetailNew');await expect(page.locator(input('DetailTitle'))).toHaveValue('');await expect(page.locator(input('DetailBody'))).toHaveValue('');
  await kind('Comments');const comment=initial.entries.find(e=>e.kind==='comment');await row(comment.body);await expect(page.locator(input('DetailBody'))).toHaveValue(comment.body);await expect(page.locator(c('DetailTree'))).toContainText(shown(comment.author)+': '+shown(comment.body));
  await kind('Checklists');const checklist=initial.entries.find(e=>e.kind==='checklist');await row(checklist.title);await expect(page.locator(input('DetailTitle'))).toHaveValue(checklist.title);
  await kind('Attachments');await expect(page.locator(c('DetailTree'))).toContainText(shown(initial.files[0].filename));await expect(page.locator(c('DetailsPanel')+' tag')).toHaveCount(0);
  await page.reload();await page.locator(`.weba-card[data-card-id="${seed.items[0].card}"] .weba-card-menu`).click();await click('ContextComments');await kind('Custom fields');await row(local);await expect(page.locator(input('DetailBody'))).toHaveValue(retryBody);const deleteDraft=retryBody+' pending delete';
  await page.locator(input('DetailBody')).evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},deleteDraft);await settle();
  const beforeDelete=sql();sql("CREATE TRIGGER detail_delete_final AFTER DELETE ON kb_entries WHEN OLD.board_id="+seed.board+" AND OLD.card_id="+seed.items[0].card+" AND OLD.kind='custom' BEGIN UPDATE kb_cards SET archived=1 WHERE id="+seed.items[0].card+"; END");
  try{
   await click('DetailDelete');await expect(page.locator(c('Notice'))).toContainText('Card archive state changed');
   await expect(page.locator(input('DetailTitle'))).toHaveValue(local);await expect(page.locator(input('DetailBody'))).toHaveValue(deleteDraft);
   expect(sql()).toBe(beforeDelete);expect(read().entries.find(e=>e.kind==='custom')).toMatchObject({title:local,body:retryBody});
  }finally{sql('DROP TRIGGER detail_delete_final');}
  await click('DetailDelete');expect(read().entries.some(e=>e.kind==='custom')).toBe(false);
  await expect(page.locator(input('DetailTitle'))).toHaveValue('');await expect(page.locator(input('DetailBody'))).toHaveValue('');
  await expect(page.locator(c('DetailTree')+' tr[id]').filter({hasText:shown(local)})).toHaveCount(0);
  await kind('Time tracking');
  for(const [control,action] of [['DetailStart','start'],['DetailStop','stop']]){
   const beforeTimer=sql();sql('CREATE TRIGGER detail_timer_final AFTER INSERT ON kb_history BEGIN UPDATE kb_cards SET archived=1 WHERE id='+seed.items[0].card+'; END');
   try{await click(control);await expect(page.locator(c('Notice'))).toContainText('Card archive state changed');expect(sql()).toBe(beforeTimer);}
   finally{sql('DROP TRIGGER detail_timer_final');}
   await click(control);
   const timers=read().entries.filter(e=>e.kind==='time');expect(timers).toHaveLength(1);expect(Boolean(timers[0].done)).toBe(action==='stop');
   await expect(page.locator(c('DetailTree'))).toContainText(action==='start'?'Running timer':'Tracked time');
  }
  await kind('Attachments');await row(initial.files[0].filename);
  const uploadBytes=Buffer.from([0,1,255,10,32,39,194,169]);
  async function upload(name){const chooser=page.waitForEvent('filechooser');await click('DetailUpload');await(await chooser).setFiles({name,mimeType:'application/octet-stream',buffer:uploadBytes});}
  for(const [stage,table,error] of [['AFTER INSERT ON kb_files','kb_boards','Board archive state changed'],['AFTER INSERT ON kb_history','kb_cards','Card archive state changed']]){
   await row(initial.files[0].filename);await expect(page.locator(c('DetailDownload'))).toBeEnabled();
   const name=table+' native <literal> Ω.bin',beforeUpload=sql();
   sql('CREATE TRIGGER detail_upload_final '+stage+' BEGIN UPDATE '+table+' SET archived=1 WHERE id='+(table==='kb_boards'?seed.board:seed.items[0].card)+'; END');
   try{await upload(name);await expect(page.locator(c('Notice'))).toContainText(error);expect(sql()).toBe(beforeUpload);expect(read().files.some(f=>f.filename===name)).toBe(false);await expect(page.locator(c('DetailDownload'))).toBeEnabled();}
   finally{sql('DROP TRIGGER detail_upload_final');}
   await upload(name);await expect(page.locator(c('DetailTree'))).toContainText(name);
   expect(read().files.find(f=>f.filename===name)).toMatchObject({data:uploadBytes.toString('base64')});
   await expect(page.locator(c('DetailsPanel')+' literal')).toHaveCount(0);
  }
  await row(initial.files[0].filename);await expect(page.locator(c('DetailDownload'))).toBeEnabled();
  const beforeFileDelete=sql();sql('CREATE TRIGGER detail_lifecycle_final AFTER INSERT ON kb_history BEGIN UPDATE kb_boards SET archived=1 WHERE id='+seed.board+'; END');
  try{await click('DetailDelete');await expect(page.locator(c('Notice'))).toContainText('Board archive state changed');expect(sql()).toBe(beforeFileDelete);expect(read().files.some(f=>f.filename===initial.files[0].filename)).toBe(true);await expect(page.locator(c('DetailDownload'))).toBeEnabled();}
  finally{sql('DROP TRIGGER detail_lifecycle_final');}
  await click('DetailDelete');expect(read().files.some(f=>f.filename===initial.files[0].filename)).toBe(false);
  await click('DetailAttachmentHistory');await row(initial.files[0].filename);await expect(page.locator(c('DetailRestoreAttachment'))).toBeVisible();
  const beforeFileRestore=sql();sql('CREATE TRIGGER detail_lifecycle_final AFTER INSERT ON kb_history BEGIN UPDATE kb_cards SET archived=1 WHERE id='+seed.items[0].card+'; END');
  try{await click('DetailRestoreAttachment');await expect(page.locator(c('Notice'))).toContainText('Card archive state changed');expect(sql()).toBe(beforeFileRestore);expect(read().files.some(f=>f.filename===initial.files[0].filename)).toBe(false);await expect(page.locator(c('DetailRestoreAttachment'))).toBeVisible();}
  finally{sql('DROP TRIGGER detail_lifecycle_final');}
  await click('DetailRestoreAttachment');expect(read().files.find(f=>f.filename===initial.files[0].filename)).toMatchObject({data:initial.files[0].data});
  await click('DetailLiveAttachments');await expect(page.locator(c('DetailTree'))).toContainText(shown(initial.files[0].filename));
  expect(errors).toEqual([]);
  console.log('Detail complete-text browser: native custom/comment/checklist/file text, exact encoded editor values, external suffix heartbeat, dirty local title with independent external body save, post-history archive refusal keeps all board data and exact dirty draft, retry, New clears stale values, literal markup/reload and delete rollback with exact dirty/provenance retention and retry, timer start/stop post-history rollback and retry, file chooser upload data/history archive rollback, retained selection and exact-byte retry, attachment delete/restore post-history archive rollback with retained live/history selection and retry passed');
 }finally{if(context)await context.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
