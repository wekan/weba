'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original Playwright required');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test'),browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 const f=JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}}));
 const fixture=mode=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCopyFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_COPY_BOARD:String(f.boardId),WEBA_COPY_MODE:mode}}));
 const control=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(control(n)).click();await settle(p);},forge=async(p,n)=>{await p.evaluate(n=>gw.raise(document.querySelector(`[id$=".${n}"]`).id,'click',[]),n);await settle(p);};
 try{
  fixture('manager');
  async function open(name){const c=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.waitForFunction(()=>window.webaI18n);await p.evaluate(()=>webaI18n.setLanguage('en'));await p.locator(input('WebTextName')).fill(name);await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await p.locator(`[data-board-key="b${f.boardId}"]`).click();await settle(p);return p;}
  async function menu(p){if(!await p.locator(control('PageSidebar')).isVisible())await click(p,'SidebarToggle');await click(p,'BoardSettings');}
  const reader=await open('rest-file-reader'),manager=await open('rest-member');
  await menu(reader);await expect(reader.locator(control('ContextCopy'))).toBeHidden();const before=fixture('read');await forge(reader,'ContextCopy');await expect(reader.locator(control('ActionPanel'))).toBeHidden();await expect(reader.locator(control('Notice'))).toContainText('Board permission denied');expect(fixture('read')).toEqual(before);
  await menu(manager);await click(manager,'ContextCopy');await manager.locator(input('ActionText')).fill('Manager guarded copy');await click(manager,'ActionConfirm');expect(fixture('read').boards).toBe(before.boards+1);expect(fixture('read').files).toBe(before.files+2);
  await expect(manager.locator('.weba-content')).not.toHaveAttribute('data-board',String(f.boardId));await click(manager,'Home');await manager.locator(`[data-board-key="b${f.boardId}"]`).click();await settle(manager);
  await menu(manager);await click(manager,'ContextCopy');await manager.locator(input('ActionText')).fill('Stale manager copy');const saved=fixture('read');fixture('demote');await expect(manager.locator(control('ActionPanel'))).toBeHidden();await expect(manager.locator(input('ActionText'))).toHaveValue('');await forge(manager,'ActionConfirm');await expect(manager.locator(control('Notice'))).toContainText('Board permission denied');expect(fixture('read')).toEqual(saved);
  await menu(manager);await expect(manager.locator(control('ContextCopy'))).toBeHidden();await forge(manager,'ContextCopy');await expect(manager.locator(control('ActionPanel'))).toBeHidden();expect(fixture('read')).toEqual(saved);expect(errors).toEqual([]);
  console.log('Board copy browser: readonly hidden/forged open denial, real manager copy with retained bytes, live demotion clears form and forged stale save creates no boards/files passed');
 }finally{try{fixture('demote');}finally{for(const c of contexts)await c.close();await browser.close();}}
})().catch(error=>{let message=String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
