'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const initial=fixture('read'),seeded=fixture('seed-order','rest-other'),ids=seeded.ids.map(String),base=new URL(process.env.WEBA_TEST_URL).origin;
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 const control=n=>`[id$=".${n}"]`,entry=n=>`[id$=".${n}:entry"]`,bar='.js-home-remove',state=()=>fixture('read'),settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async n=>{await settle();await page.locator(control(n)).click();await settle();};
 // The separate document deliberately has no native form, session, selection or
 // access adapter: it supplies only the same untrusted MIME IDs as another tab.
 async function pickup(payload,markers={}){
  await settle();await page.evaluate(({payload,markers})=>{
   document.getElementById('external-source')?.remove();const frame=document.createElement('iframe');frame.id='external-source';frame.style.cssText='position:fixed;right:4px;bottom:4px;width:180px;height:100px;z-index:9999';document.body.append(frame);
   frame.contentDocument.body.innerHTML='<div id="origin" draggable="true" style="width:150px;height:70px;background:#ddd">External board</div>';
   frame.contentDocument.getElementById('origin').addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',payload);for(const [k,v] of Object.entries(markers))e.dataTransfer.setData(k,v);e.dataTransfer.effectAllowed='all';});
  },{payload,markers});
  const r=await page.frameLocator('#external-source').locator('#origin').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-20,r.y+r.height/2-20,{steps:4});
 }
 async function move(selector){const r=await page.locator(selector).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:15});}
 async function release(){await page.mouse.up();await page.waitForTimeout(750);await settle();await page.evaluate(()=>document.getElementById('external-source')?.remove());}
 async function drop(payload,markers={},target=control('HomeBoards')){await pickup(payload,markers);await move(target);await release();}
 const remaining={'application/x-board-from-remaining':'1'},home={'application/x-board-from-home':'1'},multi={'application/x-board-multi':'true'};
 async function wire(payload,flag,target,origin){await page.evaluate(values=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',['home-external',...values.map(v=>btoa(v))].join('|')),[payload,flag,target,origin]);await settle();}
 try{
  fixture('clear-home');page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/allboards/home');await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await page.locator(entry('WebTextName')).fill('rest-member');await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click('WebButtonLogin');await expect(page.locator(control('PaneTitle'))).toHaveText('Home');
  const before=state();await drop(ids[0],remaining);await expect.poll(()=>state().home).toBe(Number(ids[0]));await expect(page.locator(`.weba-board-tile-group[data-board-id="${ids[0]}"]`)).toHaveCount(1);await drop(ids[0],remaining);expect(state().home).toBe(Number(ids[0]));
  await drop(String(seeded.privateId),remaining);await expect(page.locator(control('Notice'))).toContainText('Board not accessible');expect(state().home).toBe(Number(ids[0]));
  await click('MultiBoards');await page.locator('.weba-board-select').check();await settle();await drop(JSON.stringify([ids[0],ids[1]]),multi);await expect(page.locator(control('Notice'))).toContainText('Please select only one board');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('1');expect(state().home).toBe(Number(ids[0]));
  await drop(JSON.stringify([ids[1]]),multi);await expect.poll(()=>state().home).toBe(Number(ids[1]));await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('0');await click('MultiBoards');
  // Refused targets must finish without leaving an external Remove bar behind.
  await drop(ids[1],home,control('Remaining'));expect(state().home).toBe(Number(ids[1]));await expect(page.locator(bar)).toBeHidden();await expect(page.locator(control('PaneTitle'))).toHaveText('Home');
  await pickup(ids[1],home);await move('.weba-content');await expect(page.locator(bar)).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator(bar)).toBeHidden();await release();expect(state().home).toBe(Number(ids[1]));
  await pickup(ids[1],home);await move('.weba-content');await expect(page.locator(bar)).toBeVisible();await move(bar);await expect(page.locator(bar)).toHaveClass(/is-over/);page.once('dialog',d=>d.dismiss());await release();expect(state().home).toBe(Number(ids[1]));await expect(page.locator(bar)).toBeHidden();
  await pickup(ids[0],home);await move('.weba-content');await move(bar);page.once('dialog',d=>d.accept());await release();expect(state().home).toBe(Number(ids[1]));
  await pickup(ids[1],home);await move('.weba-content');await move(bar);page.once('dialog',d=>d.accept());await release();await expect.poll(()=>state().home).toBe(0);await expect(page.locator(bar)).toBeHidden();
  await drop(ids[0],{'application/x-archived-board-multi':'1'});expect(state().home).toBe(0);
  await drop(ids[0],{'application/x-workspace-id':'1'});expect(state().home).toBe(0);
  for(const payload of ['[null]','[1]','{}','["'+ids[0]+'",{}]','["01"]']){await drop(payload,multi);await expect(page.locator(control('Notice'))).toContainText('Invalid board drop');expect(state().home).toBe(0);}
  await wire(ids[0],'','home','home');await expect(page.locator(control('Notice'))).toContainText('Invalid Home board drop');expect(state().home).toBe(0);
  await click('Remaining');await wire(ids[0],'','home-remove','home');await expect(page.locator(control('Notice'))).toContainText('Invalid Home board drop');expect(state().home).toBe(0);
  fixture('archive-space-board','rest-other',{WEBA_SPACE_BOARD:ids[0]});await drop(ids[0],remaining);await expect(page.locator(control('Notice'))).toContainText('Board not accessible');expect(state().home).toBe(0);expect(state().rawArchived[ids[0]]).toBe(true);fixture('restore-space-board','rest-other',{WEBA_SPACE_BOARD:ids[0]});
  await drop(ids[0],remaining);await expect.poll(()=>state().home).toBe(Number(ids[0]));await wire(ids[1],'','archive','remaining');await expect(page.locator(control('Notice'))).toContainText('Invalid Home board drop');expect(state().home).toBe(Number(ids[0]));
  fixture('revoke-space-board','rest-other',{WEBA_SPACE_BOARD:ids[0]});await drop(ids[0],remaining);await expect(page.locator(control('Notice'))).toContainText('Board not accessible');expect(state().home).toBe(Number(ids[0]));fixture('grant-space-board','rest-other',{WEBA_SPACE_BOARD:ids[0]});
  await click('HomeBoards');await page.locator('.weba-board-tile').click();await settle();await expect(page.locator('.weba-content')).not.toHaveAttribute('data-board','0');await wire(ids[1],'','home','remaining');await expect(page.locator(control('Notice'))).toContainText('Select All Boards first');expect(state().home).toBe(Number(ids[0]));
  const after=state();expect(after.rawStars).toEqual(before.rawStars);expect(after.rawAssignments).toEqual(before.rawAssignments);expect(errors).toEqual([]);
  console.log('Cross-document Home browser: real iframe-to-native HTML5 single/group replace, private/archived/malformed denial, retained multi refusal/reset, Home Remove-only Escape/cancel/conditional/confirmed clearing, refused-target cleanup, MIME/workspace rejection, forged non-Home removal/board-view/archive-command and revoked-membership denial and unchanged stars/placement passed');
 }finally{try{fixture('clear-home');fixture('cleanup-home','rest-member',{WEBA_HOME_IDS:JSON.stringify([...ids,String(seeded.privateId)]),WEBA_HOME_SORT:initial.sortBy});}finally{await context.close();await browser.close();}}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
