'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=extra=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',...extra}}));
 const seed=fixture({}),live=suffix=>fixture({WEBA_NATIVE_MODE:'live',WEBA_NATIVE_BOARD:String(seed.board),WEBA_NATIVE_CARD:String(seed.items[0].card),WEBA_NATIVE_SUFFIX:suffix});
 const first=live('A'),shown=text=>text.replaceAll('\0',''),c=name=>`[id$=".${name}"]`,errors=[];
 let browser,context;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});
  async function open(){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.WEBA_TEST_URL);await page.locator('[id$=".WebTextName:entry"]').fill('rest-other');await page.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);await page.locator(c('WebButtonLogin')).click();await expect(page.locator('.weba-content')).toBeVisible();return page;}
  const overview=await open(),board=await context.newPage();board.on('pageerror',e=>errors.push(e.message));await board.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
  const tile=overview.locator(`.weba-board-tile[data-board-key="b${seed.board}"]`),card=board.locator(`.weba-card-link[data-card-id="${seed.items[0].card}"]`);
  await expect(tile).toHaveText(shown(first.boardTitle));await expect(card.locator("strong")).toHaveText(shown(first.cardTitle));
  const second=live('B');
  await overview.bringToFront();await expect(tile).toHaveText(shown(second.boardTitle),{timeout:15000});
  await board.bringToFront();await expect(card.locator("strong")).toHaveText(shown(second.cardTitle),{timeout:15000});
  await expect(board.locator(c('Boards'))).toContainText(shown(second.boardTitle));
  await expect(board.locator('.weba-content tag')).toHaveCount(0);
  await board.reload();await expect(card.locator("strong")).toHaveText(shown(second.cardTitle));
  await card.click();await expect(board.locator('[id$=".CardTitle:entry"]')).toHaveValue(second.cardTitle);
  expect(errors).toEqual([]);
  console.log('Live complete-text browser: external same-prefix NUL suffix changes refresh native overview, board report and navigation on heartbeat; literal markup, reload and full editor values passed');
 }finally{if(context)await context.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
