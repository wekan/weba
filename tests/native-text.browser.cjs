'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 let browser,context;
 try{
  const seed=JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}}));
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],c=n=>`[id$=".${n}"]`;
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.WEBA_TEST_URL);await page.locator('[id$=".WebTextName:entry"]').fill('rest-other');await page.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);await page.locator(c('WebButtonLogin')).click();
  await expect(page.locator('.weba-content')).toBeVisible();await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
  const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  async function click(name){await settle();await page.locator(c(name)).click();await settle();}
  async function columns(){for(const item of seed.items){
   const column=page.locator('.weba-report .weba-column[data-list-id="'+item.list+'"]');
   await expect(column).toHaveCount(1);expect(await column.getAttribute('data-lane')).toBe(item.lane);expect(await column.getAttribute('data-list')).toBe(item.title);
   const card=column.locator('[data-card-id="'+item.card+'"]');await expect(card).toHaveCount(1);expect(await card.getAttribute('data-lane')).toBe(item.lane);expect(await card.getAttribute('data-status')).toBe(item.title);
  }await expect(page.locator('.weba-report tag')).toHaveCount(0);}
  await columns();await click('ViewMenu');await click('Swimlanes');await columns();await expect(page.locator('.weba-report>.weba-swimlane')).toHaveCount(2);
  await page.reload();await columns();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>webaI18n.setLanguage('fi'));await columns();
  await click('ViewMenu');await click('TableView');for(const item of seed.items){const cells=await page.locator('.weba-report tr').filter({has:page.locator('[data-card-id="'+item.card+'"]')}).locator('td').allTextContents();expect(cells).toContain(item.lane);expect(cells).toContain(item.title);}
  for(const username of ['rest-native-reader','rest-native-assigned']){
   const readerContext=await browser.newContext();
   try{
    const reader=await readerContext.newPage();reader.on('pageerror',e=>errors.push(e.message));await reader.goto(process.env.WEBA_TEST_URL);
    await reader.locator('[id$=".WebTextName:entry"]').fill(username);await reader.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);await reader.locator(c('WebButtonLogin')).click();await expect(reader.locator('.weba-content')).toBeVisible();await reader.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
    for(const item of seed.items){const column=reader.locator('.weba-report .weba-column[data-list-id="'+item.list+'"]');await expect(column).toHaveCount(1);expect(await column.getAttribute('data-lane')).toBe(item.lane);expect(await column.getAttribute('data-list')).toBe(item.title);}
    await expect(reader.locator('.weba-report [data-card-id="'+seed.items[0].card+'"]')).toHaveCount(1);
    await expect(reader.locator('.weba-report [data-card-id="'+seed.items[1].card+'"]')).toHaveCount(username==='rest-native-reader'?1:0);
    await expect(reader.locator('.weba-add-card-top,.weba-drag-handle')).toHaveCount(0);
   }finally{await readerContext.close();}
  }
  expect(errors).toEqual([]);
  console.log('Native complete text browser: shared-prefix NUL/Unicode/markup lane/list identities retain exact columns/card placement across views/reload/Finnish/mobile; readonly and assigned-only card scope passed');
 }finally{try{if(context)await context.close();}finally{if(browser)await browser.close();}}
})().catch(e=>{let s=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)s=s.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(s);process.exitCode=1;});
