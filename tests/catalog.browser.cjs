// Native Gambas All Boards controls backed by actual SQL pages/preferences.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP native catalog browser: original Playwright unavailable; UI coverage remains unverified');return;}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-other')=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user}}));
 fixture('seed');
 let browser,context;const errors=[];
 const control=name=>`[id$=".${name}"]`,input=name=>`[id$=".${name}:entry"]`;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const click=async name=>{await settle();await page.locator(control(name)).click();await settle();};
  const fill=async(name,text)=>{await settle();await page.locator(input(name)).fill(text);};
  await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));
  await fill('WebTextName','rest-other');await fill('WebTextPass',process.env.WEBA_TEST_PASSWORD);await click('WebButtonLogin');
  await expect(page.locator(control('SortBoards'))).toBeVisible();
  await expect(page.locator(control('BoardPagination'))).toBeHidden();
  expect(fixture('read').sortBy).toBe('custom');
  const names=()=>page.locator('.weba-board-tile strong').allTextContents();
  const catalogNames=async()=>(await names()).filter(name=>/^Catalog Board /.test(name));
  await click('HeaderSearch');await expect(page.locator(input('BoardSearch'))).toBeFocused();
  await fill('BoardSearch','Catalog Board');await expect.poll(catalogNames).toHaveLength(30);
  async function menuTransitions(){
   const saved=fixture('read').sortBy;
   await click('SortBoards');await expect(page.locator(control('BoardSortMenu'))).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator(control('BoardSortMenu'))).toBeHidden();
   await click('SortBoards');await expect(page.locator(control('BoardSortMenu'))).toBeVisible();
   await click('ViewMenu');await expect(page.locator(control('Views'))).toBeVisible();await expect(page.locator(control('BoardSortMenu'))).toBeHidden();await click('CloseViews');
   await click('SortBoards');await click('AccountToggle');await expect(page.locator(control('AccountMenu'))).toBeVisible();await expect(page.locator(control('BoardSortMenu'))).toBeHidden();await click('CloseAccount');
   await click('AccountToggle');await click('SortBoards');await expect(page.locator(control('AccountMenu'))).toBeHidden();await click('CloseBoardSort');
   await click('ViewMenu');await click('SortBoards');await expect(page.locator(control('Views'))).toBeHidden();await click('CloseBoardSort');
   for(const navigation of ['Home','Remaining','Starred','Archive']){await click('SortBoards');await click(navigation);await expect(page.locator(control('BoardSortMenu'))).toBeHidden();}
   await click('Home');expect(fixture('read').sortBy).toBe(saved);
  }
  await menuTransitions();await expect(page.locator(input('BoardSearch'))).toHaveValue('Catalog Board');await expect.poll(catalogNames).toHaveLength(30);

  await click('SortBoards');await click('SortTitleAsc');
  await expect(page.locator(control('BoardPagination'))).toBeVisible();
  await expect.poll(catalogNames).toEqual(Array.from({length:25},(_,i)=>'Catalog Board '+String(i+1).padStart(2,'0')));
  expect(fixture('read').sortBy).toBe('title-asc');expect(fixture('read','rest-owner').sortBy).toBe('custom');
  await click('SortBoards');await expect(page.locator(control('SortTitleAsc'))).toHaveClass(/active/);await expect(page.locator(control('SortTitleAsc'))).toHaveClass(/fa-sort-alpha-asc/);await expect(page.locator(control('SortTitleAsc'))).toHaveCSS('background-color','rgb(40, 120, 168)');await click('CloseBoardSort');
  await click('NextBoardPage');await expect.poll(catalogNames).toEqual(['Catalog Board 26','Catalog Board 27','Catalog Board 28','Catalog Board 29','Catalog Board 30']);
  await expect(page.locator(control('NextBoardPage'))).toBeDisabled();await expect(page.locator(control('BoardPageLabel'))).toContainText('2 / 2');
  await click('PreviousBoardPage');await expect(page.locator(control('BoardPageLabel'))).toContainText('1 / 2');
  await click('NextBoardPage');fixture('archive-last');await page.bringToFront();
  await expect(page.locator(control('BoardPageLabel'))).toContainText('1 / 1');await expect.poll(catalogNames).toHaveLength(25);
  fixture('restore-last');await expect(page.locator(control('BoardPageLabel'))).toContainText('1 / 2');
  await click('SortBoards');await click('SortTitleDesc');
  await expect.poll(catalogNames).toEqual(Array.from({length:25},(_,i)=>'Catalog Board '+String(30-i).padStart(2,'0')));
  await click('NextBoardPage');await fill('BoardSearch','catalog board 0');
  await expect.poll(catalogNames).toEqual(Array.from({length:9},(_,i)=>'Catalog Board 0'+(9-i)));
  await expect(page.locator(control('BoardPageLabel'))).toContainText('1 / 1');
  await fill('BoardSearch','this-board-does-not-exist-xyz');await expect.poll(names).toEqual([]);
  await fill('BoardSearch','ångström');await expect.poll(names).toEqual(['Ångström catalog']);
  await fill('BoardSearch','Private owner board');await expect.poll(names).toEqual([]);
  await click('ClearBoardSearch');await expect(page.locator(input('BoardSearch'))).toHaveValue('');await expect.poll(names).toHaveLength(25);
  await page.reload();await expect(page.locator(control('SortBoards'))).toBeVisible();await click('SortBoards');
  await expect(page.locator(control('SortTitleDesc'))).toHaveClass(/active/);expect(fixture('read').sortBy).toBe('title-desc');
  fixture('set-asc');await page.bringToFront();await expect(page.locator(control('SortTitleAsc'))).toHaveClass(/active/);
  await click('SortCustom');await expect(page.locator(control('BoardPagination'))).toBeHidden();await expect.poll(catalogNames).toHaveLength(30);
  await page.setViewportSize({width:390,height:844});
  if(await page.locator(control('PageSidebar')).isVisible())await click('CloseSidebar');
  await menuTransitions();
  await click('SortBoards');
  const box=await page.locator(control('BoardSortMenu')).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
  await click('SortTitleAsc');await expect(page.locator(control('BoardPagination'))).toBeVisible();
  for(const name of ['SortBoards','PreviousBoardPage','NextBoardPage']){const rect=await page.locator(control(name)).boundingBox();expect(rect.x,name+' left').toBeGreaterThanOrEqual(0);expect(rect.x+rect.width,name+' right').toBeLessThanOrEqual(390);}
  await click('NextBoardPage');await expect(page.locator(control('BoardPageLabel'))).toContainText('2 / 2');
  await page.evaluate(()=>webaI18n.setLanguage('fi'));await click('SortBoards');
  const finnish=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/fi.i18n.json'),'utf8'));
  await expect(page.locator(control('SortTitleAsc'))).toHaveText(finnish['sort-boards-title-asc']);
  await expect(page.locator(control('BoardSearchLabel'))).toHaveText(finnish['search-boards']);
  expect(errors).toEqual([]);
  console.log('Native catalog browser: custom/unpaged and saved A-Z/Z-A choices, 25/5 disjoint pages, live search/reset, Unicode/private search, reload/personal isolation, external sort/page clamping, desktop/mobile menu exclusion/navigation, paging and Finnish labels passed');
 }finally{if(context)await context.close();if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
