// Actual native form state and authoritative multi-drop transport.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-other',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const seeded=fixture('seed-selection-basic'),ids=seeded.ids.map(String),privateId=String(fixture('private-drop-board','rest-owner').privateDropBoard);
 const space=String(fixture('create-space','rest-member',{WEBA_SPACE_NAME:'Selection destination'}).spaceId);
 const control=name=>`[id$=".${name}"]`,entry=name=>`[id$=".${name}:entry"]`,tile=id=>`.weba-board-tile-group[data-board-id="${id}"]`,box=id=>tile(id)+' .weba-board-select';
 const state=()=>fixture('read','rest-member');let browser,context;const errors=[];
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
  const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
  async function login(){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await page.locator(entry('WebTextName')).fill('rest-member');await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');return page;}
  const page=await login();await click(page,'MultiBoards');await expect(page.locator(box(ids[0]))).toBeVisible();
  await page.locator(box(ids[0])).check();await settle(page);await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('1');
  await click(page,'HeaderSearch');await page.locator(entry('BoardSearch')).fill('Selection Bravo');await expect(page.locator(tile(ids[0]))).toBeHidden();await expect(page.locator(tile(ids[1]))).toBeVisible();await click(page,'SelectAllBoards');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('2');
  const wire=(kind,values)=>[kind,...values.map(v=>Buffer.from(String(v)).toString('base64'))].join('|');
  const send=async(name,value)=>{await page.evaluate(({name,value})=>gw.update(document.querySelector(`[id$=".${name}"]`).id,'text',value),{name,value});await settle(page);};
  const revision=()=>page.locator('.weba-content').getAttribute('data-selection-revision');
  const before=state().rawAssignments;
  await send('BoardSelectionAction',wire('toggle',[privateId]));await expect(page.locator(control('Notice'))).toContainText('Invalid board selection');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('2');
  await send('DragAction',wire('board-multi-drop',[ids[1],'workspace',space,Number(await revision())-1]));await expect(page.locator(control('Notice'))).toContainText('Board selection changed');expect(state().rawAssignments).toEqual(before);
  await send('DragAction',wire('board-drop',[ids[1],'workspace',space,'']));await expect(page.locator(control('Notice'))).toContainText('Board selection changed');expect(state().rawAssignments).toEqual(before);
  await click(page,'CloseSidebar');
  // One visible origin transports the retained off-filter board, never a browser ID list.
  const start=await page.locator(tile(ids[1])+' .weba-board-drag').boundingBox(),dest=await page.locator(`.weba-space-row[data-workspace-id="${space}"]`).boundingBox();
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:12});await expect(page.locator('.weba-multidrag-count')).toHaveText('2');await page.mouse.up();await page.waitForTimeout(750);await settle(page);
  await expect.poll(()=>state().rawAssignments[ids[0]]).toBe(space);expect(state().rawAssignments[ids[1]]).toBe(space);expect(state().rawAssignments[ids[2]]).toBeUndefined();await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('2');
  await click(page,'SelectNoBoards');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('0');
  await click(page,'MultiBoards');await expect(page.locator('.weba-board-select')).toHaveCount(0);await click(page,'MultiBoards');
  await click(page,'CloseMultiBoards');await expect(page.locator('.weba-board-select')).toHaveCount(0);
  // Reload is a new form with no inherited selection.
  await page.reload();await expect(page.locator('.weba-content')).toHaveAttribute('data-multi-active','false');
  const second=await context.newPage();await second.goto(process.env.WEBA_TEST_URL);await expect(second.locator('.weba-content')).toHaveAttribute('data-selection-count','0');
  const paging=fixture('seed-selection').ids.map(String);
  await page.bringToFront();await click(page,'SortBoards');await click(page,'SortTitleAsc');await click(page,'HeaderSearch');await page.locator(entry('BoardSearch')).fill('Selection Paging');await expect(page.locator('.weba-board-tile-group')).toHaveCount(25);
  await click(page,'MultiBoards');await click(page,'SelectAllBoards');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('25');await click(page,'NextBoardPage');await expect(page.locator('.weba-board-tile-group')).toHaveCount(5);await click(page,'SelectAllBoards');await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('30');
  // A retained board revoked off-page denies the complete batch without partial writes.
  fixture('revoke-space-board','rest-other',{WEBA_SPACE_BOARD:paging[0]});const snapshot=state().rawAssignments;
  await send('DragAction',wire('board-multi-drop',[paging[29],'workspace',space,await revision()]));expect(state().rawAssignments).toEqual(snapshot);await expect(page.locator(control('SelectedBoardsCount'))).toHaveText('30');
  fixture('grant-space-board','rest-other',{WEBA_SPACE_BOARD:paging[0]});
  await click(page,'CloseSidebar');await page.setViewportSize({width:390,height:844});if(!await page.locator(control('LeftNavigation')).isVisible())await click(page,'ToggleNavigation');
  await page.waitForTimeout(1200);await settle(page);await page.locator(tile(paging[25])+' .weba-board-drag').scrollIntoViewIfNeeded();
  const touch=await context.newCDPSession(page),from=await page.locator(tile(paging[25])+' .weba-board-drag').boundingBox(),to=await page.locator(`.weba-space-row[data-workspace-id="${space}"]`).boundingBox();
  const points=n=>[{x:Math.round(from.x+from.width/2+(to.x+to.width/2-from.x-from.width/2)*n/8),y:Math.round(from.y+from.height/2+(to.y+to.height/2-from.y-from.height/2)*n/8),id:1}];
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(0)});for(let n=1;n<=8;n++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(n)});await page.waitForTimeout(25);}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>paging.filter(id=>state().rawAssignments[id]===space).length,{message:JSON.stringify({from,to,notice:await page.locator(control('Notice')).textContent()})}).toBe(30);
  expect(errors).toEqual([]);console.log('Native selection browser: checkbox controls, retained filtered selection, visible-only Select All, private toggle/stale revision/single-drop bypass denial, real grouped drop and SQL isolation, clear/disable/reload/form isolation passed');
 }finally{if(context)await context.close();if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
