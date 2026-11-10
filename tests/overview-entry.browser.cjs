'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original Playwright required');const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const {allBoardsPath}=require(path.join(source,'models/lib/allBoardsUrls.js'));
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[],badAssets=[],control=n=>`[id$=".${n}"]`,entry=n=>`[id$=".${n}:entry"]`,base=new URL(process.env.WEBA_TEST_URL).origin;
 try{
  for(const [route,title] of [['/allboards/starred?c=forged-command','Starred'],['/allboards/remaining/','Remaining'],['/%61llboards/%61rchive','Archive']]){
   const section=title.toLowerCase();expect(decodeURIComponent(new URL(route,base).pathname).replace(/\/$/,'' )).toBe(allBoardsPath(section,[]));
   const context=await browser.newContext();contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).origin===base&&r.status()>=400)badAssets.push(r.url());});
   await page.goto(base+route);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await page.locator(entry('WebTextName')).fill('rest-member');await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await page.locator(control('WebButtonLogin')).click();await expect(page.locator(control('PaneTitle'))).toHaveText(title);expect(decodeURIComponent(new URL(page.url()).pathname).replace(/\/$/,'')).toBe(allBoardsPath(section,[]));await page.waitForFunction(()=>window.webaWorkspaceMarkdown);expect(await page.evaluate(()=>document.baseURI)).toBe(base+'/');
   // Re-enter while authenticated and reload: the URL decides initial section.
   await page.goto(base+route);await expect(page.locator(control('PaneTitle'))).toHaveText(title);await page.reload();await expect(page.locator(control('PaneTitle'))).toHaveText(title);
   if(section!=='remaining'){await page.locator(control('Remaining')).click();await expect(page.locator(control('PaneTitle'))).toHaveText('Remaining');await expect(page).toHaveURL(base+allBoardsPath('remaining',[]));await page.reload();await expect(page.locator(control('PaneTitle'))).toHaveText('Remaining');await page.goto(base+route);await expect(page.locator(control('PaneTitle'))).toHaveText(title);}
   await page.evaluate(()=>gw.update(document.querySelector('[id$=".EntryRouteAction"]').id,'text','admin|forged-section'));await expect(page.locator(control('Notice'))).toContainText('Unknown overview entry');await expect(page.locator(control('PaneTitle'))).toHaveText(title);await expect(page.locator(control('AdminPanel'))).toBeHidden();
   await page.setViewportSize({width:390,height:844});await expect(page.locator(control('PaneTitle'))).toHaveText(title);
  }
  expect(errors).toEqual([]);expect(badAssets).toEqual([]);console.log('Overview entry browser: production remaining/starred/archive URLs, login handoff, authenticated entry/reload, single encoded/trailing paths, root asset base and forged section denial/mobile passed; other-section and full source routing remains pending');
 }finally{for(const c of contexts)await c.close();await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
