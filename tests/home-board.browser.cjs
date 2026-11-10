'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const initialSort=fixture('read').sortBy,seeded=fixture('seed-order','rest-other'),ids=seeded.ids.map(String),base=new URL(process.env.WEBA_TEST_URL).origin;
 const control=n=>`[id$=".${n}"]`,entry=n=>`[id$=".${n}:entry"]`,tile=id=>`.weba-board-tile-group[data-board-id="${id}"]`;
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),context=await browser.newContext(),errors=[];
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(page,n)=>{await settle(page);await page.locator(control(n)).click();await settle(page);};
 try{
  fixture('clear-home');
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/allboards/home');await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));
  await page.locator(entry('WebTextName')).fill('rest-member');await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');
  await expect(page.locator(control('PaneTitle'))).toHaveText('Home');await expect(page.locator(control('HomeBoardsCount'))).toHaveText('0');await expect(page.locator('.weba-board-tile-group')).toHaveCount(0);await expect(page.locator(control('AddBoardTile'))).toBeHidden();
  await click(page,'Remaining');await click(page,'MultiBoards');
  await click(page,'HomeSelectedBoards');await expect(page.locator(control('Notice'))).toContainText('Please select only one board');expect(fixture('read').home).toBe(0);await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('0');
  await page.locator(tile(ids[0])+' .weba-board-select').check();await page.locator(tile(ids[1])+' .weba-board-select').check();await settle(page);
  await click(page,'HomeSelectedBoards');await expect(page.locator(control('Notice'))).toContainText('Please select only one board');expect(fixture('read').home).toBe(0);await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('2');
  await page.locator(tile(ids[1])+' .weba-board-select').uncheck();await settle(page);
  const before=fixture('read');await click(page,'HomeSelectedBoards');expect(fixture('read').home).toBe(Number(ids[0]));expect(fixture('read').rawAssignments).toEqual(before.rawAssignments);expect(fixture('read').rawStars).toEqual(before.rawStars);await expect(page.locator(control('HomeSelectedBoards'))).toHaveText('Unset as Home board');
  await click(page,'HomeSelectedBoards');expect(fixture('read').home).toBe(0);await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('1');await click(page,'HomeSelectedBoards');expect(fixture('read').home).toBe(Number(ids[0]));
  await click(page,'HomeBoards');await expect(page).toHaveURL(base+'/allboards/home');await expect(page.locator(control('HomeBoardsCount'))).toHaveText('1');await expect(page.locator('.weba-board-tile-group')).toHaveCount(1);await expect(page.locator(tile(ids[0]))).toBeVisible();await expect(page.locator('.weba-board-drag')).toHaveCount(0);
  const deniedBefore=fixture('read');const forged=['board-drop',...([ids[0],'remaining',0,''].map(v=>Buffer.from(String(v)).toString('base64')))].join('|');
  await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),forged);await settle(page);await expect(page.locator(control('Notice'))).toContainText('Invalid Home board drop');expect(fixture('read').rawAssignments).toEqual(deniedBefore.rawAssignments);expect(fixture('read').home).toBe(deniedBefore.home);
  await page.goBack();await expect(page.locator(control('PaneTitle'))).toHaveText('Remaining');await page.goForward();await expect(page.locator(control('PaneTitle'))).toHaveText('Home');await page.reload();await expect(page.locator(tile(ids[0]))).toBeVisible();
  // Another session replaces the mark; native poll updates count/catalog without a page reload.
  fixture('set-home','rest-member',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(tile(ids[1]))).toBeVisible();await expect(page.locator(tile(ids[0]))).toHaveCount(0);
  await click(page,'HeaderSearch');await page.locator(entry('BoardSearch')).fill('Order Alpha');await expect(page.locator(tile(ids[0]))).toBeVisible();await expect(page.locator(tile(ids[1]))).toHaveCount(0);await click(page,'ClearBoardSearch');await expect(page.locator(tile(ids[1]))).toBeVisible();
  fixture('archive-space-board','rest-other',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(control('HomeBoardsCount'))).toHaveText('0');await expect(page.locator('.weba-board-tile-group')).toHaveCount(0);expect(fixture('read').home).toBe(Number(ids[1]));
  fixture('restore-space-board','rest-other',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(tile(ids[1]))).toBeVisible();
  fixture('revoke-space-board','rest-other',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(control('HomeBoardsCount'))).toHaveText('0');await expect(page.locator('.weba-board-tile-group')).toHaveCount(0);
  fixture('grant-space-board','rest-other',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(tile(ids[1]))).toBeVisible();
  await page.locator(tile(ids[1])+' .weba-board-tile').click();await expect(page.locator('.weba-content')).toHaveAttribute('data-board',ids[1]);
  fixture('clear-home');await expect(page.locator(control('HomeBoardsCount'))).toHaveText('0');await expect(page.locator('.weba-content')).toHaveAttribute('data-board',ids[1]);
  fixture('set-home','rest-member',{WEBA_SPACE_BOARD:ids[1]});await expect(page.locator(control('HomeBoardsCount'))).toHaveText('1');await expect(page.locator('.weba-content')).toHaveAttribute('data-board',ids[1]);await click(page,'HomeBoards');await expect(page.locator(tile(ids[1]))).toBeVisible();
  const fi=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/fi.i18n.json'),'utf8'));await page.evaluate(()=>webaI18n.setLanguage('fi'));await expect(page.locator(control('HomeBoards'))).toHaveText(fi.home);await page.evaluate(()=>webaI18n.setLanguage('en'));
  await page.setViewportSize({width:390,height:844});await expect(page.locator(tile(ids[1]))).toBeVisible();await expect(page.locator(control('AddBoardTile'))).toBeHidden();
  expect(errors).toEqual([]);console.log('Home browser: direct login/reload/history, private one-selection toggle and retained multi-selection denial, unchanged stars/placement, native live replace/archive/revocation/recovery, global search and mobile passed; drag/Remove bar and original board routing remain pending; login opening is covered separately');
 }finally{fixture('clear-home');fixture('cleanup-home','rest-member',{WEBA_HOME_IDS:JSON.stringify([...ids,String(seeded.privateId)]),WEBA_HOME_SORT:initialSort});await context.close();await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
