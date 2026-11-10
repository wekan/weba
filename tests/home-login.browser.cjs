'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const initialSort=fixture('read').sortBy,seeded=fixture('seed-order','rest-other'),ids=seeded.ids.map(String),base=new URL(process.env.WEBA_TEST_URL).origin;
 const control=n=>`[id$=".${n}"]`,entry=n=>`[id$=".${n}:entry"]`;
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const board=(page,id)=>expect(page.locator('.weba-content')).toHaveAttribute('data-board',String(id));
 const setHome=()=>fixture('set-home','rest-member',{WEBA_SPACE_BOARD:ids[0]});
 const change=(mode)=>fixture(mode,'rest-other',{WEBA_SPACE_BOARD:ids[0]});
 async function send(page,value){await page.evaluate(value=>gw.update(document.querySelector('[id$=".LoginLandingAction"]').id,'text',value),value);await settle(page);}
 async function login(address='/',user='rest-member'){
  const context=await browser.newContext();contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+address);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));
  await page.locator(entry('WebTextName')).fill(user);await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await page.locator(control('WebButtonLogin')).click();await page.locator(control('Home')).waitFor();await settle(page);return page;
 }
 try{
  fixture('clear-home');const empty=await login();await board(empty,0);
  setHome();await expect(empty.locator(control('HomeBoardsCount'))).toHaveText('1');await board(empty,0);await send(empty,'open');await board(empty,0);
  await empty.reload();await board(empty,ids[0]);expect(new URL(empty.url()).pathname).toBe('/');
  await empty.locator(control('Home')).click();await expect(empty.locator(control('PaneTitle'))).toHaveText('Remaining');await board(empty,0);await send(empty,'open');await board(empty,0);
  await send(empty,'open|'+seeded.privateId);await expect(empty.locator(control('Notice'))).toContainText('Invalid login landing');await board(empty,0);
  await empty.goto(base+'/');await board(empty,ids[0]);await empty.reload();await board(empty,ids[0]);
  fixture('set-home','rest-member',{WEBA_SPACE_BOARD:ids[1]});await empty.reload();await board(empty,ids[1]);setHome();await empty.reload();await board(empty,ids[0]);
  fixture('clear-home');await expect(empty.locator(control('HomeBoardsCount'))).toHaveText('0');await board(empty,ids[0]);await empty.reload();await board(empty,ids[0]);
  setHome();const owner=await login('/','rest-other');await board(owner,0);
  for(const [section,title] of [['remaining','Remaining'],['starred','Starred'],['archive','Archive'],['home','Home'],['workspaces','Workspaces']]){
   const page=await login('/allboards/'+section);await expect(page.locator(control('PaneTitle'))).toHaveText(title);await board(page,0);await send(page,'open');await expect(page.locator(control('PaneTitle'))).toHaveText(title);await board(page,0);await page.reload();await expect(page.locator(control('PaneTitle'))).toHaveText(title);await board(page,0);
  }
  change('archive-space-board');const archived=await login();await board(archived,0);expect(fixture('read').home).toBe(Number(ids[0]));change('restore-space-board');
  change('revoke-space-board');const revoked=await login();await board(revoked,0);expect(fixture('read').home).toBe(Number(ids[0]));change('grant-space-board');
  const fresh=await login();await board(fresh,ids[0]);await fresh.setViewportSize({width:390,height:844});await board(fresh,ids[0]);
  expect(errors).toEqual([]);console.log('Home login browser: private readonly root landing, no retroactive/replayed redirect, All Boards escape, full reload/new login, clear-with-open-board preservation, malformed command denial, named-section priority/reload, stale archive/revocation fallback and mobile passed; original board URLs/DDP and Sandstorm convenience remain pending');
 }finally{
  try{fixture('clear-home');fixture('cleanup-home','rest-member',{WEBA_HOME_IDS:JSON.stringify([...ids,String(seeded.privateId)]),WEBA_HOME_SORT:initialSort});}finally{for(const c of contexts)await c.close();await browser.close();}
 }
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
