// Actual native attachment delete/history/restore in independent writer/reader sessions.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original Playwright dependency required');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const f=JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}}));
 const control=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(control(n)).click();await settle(p);},select=async(p,text)=>{await p.locator(control('DetailTree')+' tr[id]').filter({hasText:text}).first().click();await settle(p);};
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 try{
  async function open(name){const context=await browser.newContext();contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.waitForFunction(()=>window.webaI18n);await p.evaluate(()=>webaI18n.setLanguage('en'));await p.locator(input('WebTextName')).fill(name);await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await p.locator(`[data-board-key="b${f.boardId}"]`).click();await settle(p);await p.locator(`.weba-card[data-card-id="${f.cardId}"] .weba-card-menu`).click();await settle(p);await click(p,'ContextAttachments');return p;}
  const writer=await open('rest-member'),reader=await open('rest-file-reader');
  await select(reader,'retained <literal>.bin');await expect(reader.locator(control('DetailDownload'))).toBeEnabled();
  await select(writer,'retained <literal>.bin');await click(writer,'DetailDelete');
  await expect(writer.locator(control('DetailTree'))).not.toContainText('retained <literal>.bin');
  await reader.bringToFront();await expect(reader.locator(control('DetailTree'))).not.toContainText('retained <literal>.bin');await expect(reader.locator(control('DetailDownload'))).toBeDisabled();
  await click(reader,'DetailAttachmentHistory');await select(reader,'retained <literal>.bin');await expect(reader.locator(control('DetailRestoreAttachment'))).toBeHidden();
  await reader.evaluate(()=>gw.raise(document.querySelector('[id$=".DetailRestoreAttachment"]').id,'click',[]));await settle(reader);await expect(reader.locator(control('Notice'))).toContainText('permission');
  await writer.bringToFront();await click(writer,'DetailAttachmentHistory');await select(writer,'retained <literal>.bin');await expect(writer.locator(control('DetailRestoreAttachment'))).toBeVisible();
  await writer.waitForTimeout(1500);await expect(writer.locator(control('DetailRestoreAttachment'))).toBeVisible();
  await click(writer,'DetailRestoreAttachment');await expect(writer.locator(control('DetailRestoreAttachment'))).toBeHidden();await click(writer,'DetailLiveAttachments');await expect(writer.locator(control('DetailTree'))).toContainText('retained <literal>.bin');
  await reader.bringToFront();await expect(reader.locator(control('DetailTree'))).toContainText('+ retained <literal>.bin');await click(reader,'DetailLiveAttachments');await select(reader,'retained <literal>.bin');await expect(reader.locator(control('DetailDownload'))).toBeEnabled();
  const check=JSON.parse(execFileSync('python3',['-c',"import sqlite3,json,sys; d=sqlite3.connect(sys.argv[1]); print(json.dumps([d.execute('SELECT hex(content) FROM kb_files WHERE id=?',(sys.argv[2],)).fetchone()[0],d.execute(\"SELECT COUNT(*) FROM kb_meta WHERE board_id=? AND kind='card' AND item_id=? AND setting='cover'\",(sys.argv[3],sys.argv[4])).fetchone()[0],d.execute('SELECT action FROM kb_attachment_history WHERE file_id=? ORDER BY id',(sys.argv[2],)).fetchall()]))",path.join(process.env.WEBA_DB_HOST,process.env.WEBA_DB_NAME),String(f.fileId),String(f.boardId),String(f.cardId)],{encoding:'utf8'}));
  expect(check).toEqual(['6B657074006279746573',0,[['removed'],['added']]]);expect(errors).toEqual([]);
  console.log('Native attachment browser: writer delete/restore, readonly history/forged restore denial, live stale selection invalidation, literal filenames, retained exact bytes and cleared cover passed');
 }finally{for(const c of contexts)await c.close();await browser.close();}
})().catch(e=>{console.error(String(e).replaceAll(process.env.WEBA_TEST_PASSWORD,'[redacted]'));process.exitCode=1;});
