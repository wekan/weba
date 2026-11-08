// Real native readonly user's personal ordering with trusted mouse/touch input.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP board order browser: original Playwright unavailable; gesture coverage remains unverified');return;}
 const helperContext={module:{exports:{}}};
 const helperText=fs.readFileSync(path.join(source,'models/lib/boardSortReorder.js'),'utf8').replace(/export\s*\{([\s\S]*?)\};/,'module.exports = {$1};');
 vm.runInNewContext(helperText,helperContext);const helpers=helperContext.module.exports;
 const userSource=fs.readFileSync(path.join(source,'models/users.js'),'utf8');
 function method(signature,args,context){const start=userSource.indexOf(signature),end=userSource.indexOf('\n  },',start);if(start<0||end<0)throw Error('Original board sort method boundary changed');return vm.runInNewContext('(async function('+args+') {'+userSource.slice(start+signature.length,end)+'\n})',context);}
 let merged;
 const saveOriginal=method('  async setBoardSortIndexes(mapping) {','mapping',{Users:{updateAsync:async(id,update)=>{merged=update.$set['profile.boardSortIndex'];}}});
 const clean=value=>JSON.parse(JSON.stringify(value));
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member')=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user}}));
 const seeded=fixture('seed-order','rest-other'),[a,b,c]=seeded.ids;
 let browser,context,otherContext;const errors=[];
 const control=name=>`[id$=".${name}"]`,input=name=>`[id$=".${name}:entry"]`;
 const tile=id=>`.weba-board-tile-group[data-board-id="${id}"]`;
 const handle=id=>tile(id)+' .weba-drag-handle';
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
 const names=page=>page.locator('.weba-board-tile strong').allTextContents();
 const wire=(id,before)=>['board',String(id),'','',String(before)].map((text,index)=>index?Buffer.from(text).toString('base64'):text).join('|');
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});otherContext=await browser.newContext();
  async function open(ctx,username){const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await page.locator(input('WebTextName')).fill(username);await page.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');await click(page,'HeaderSearch');await page.locator(input('BoardSearch')).fill('Order ');await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Bravo','Order Charlie']);await click(page,'CloseSidebar');return page;}
  const page=await open(context,'rest-member'),other=await open(otherContext,'rest-other');
  const otherBefore=fixture('read','rest-other').positions;
  await page.bringToFront();await page.locator(handle(c)).press('ArrowUp');await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Charlie','Order Bravo']);
  await expect(page.locator(handle(c))).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Bravo','Order Charlie']);await expect(page.locator(handle(c))).toBeFocused();
  await page.keyboard.press('ArrowUp');await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Charlie','Order Bravo']);await expect(page.locator(handle(c))).toBeFocused();
  const saved=fixture('read').positions;expect(saved).toEqual(clean(helpers.computeSortIndexMapping([a,c,b])));
  await other.bringToFront();await expect.poll(()=>names(other)).toEqual(['Order Alpha','Order Bravo','Order Charlie']);expect(fixture('read','rest-other').positions).toEqual(otherBefore);
  await page.bringToFront();await page.reload();await expect(page.locator(control('SortBoards'))).toBeVisible();await click(page,'HeaderSearch');await page.locator(input('BoardSearch')).fill('Order ');await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Charlie','Order Bravo']);await click(page,'CloseSidebar');
  await click(page,'SortBoards');await click(page,'SortTitleAsc');await expect(page.locator('.weba-board-drag')).toHaveCount(0);
  await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),wire(c,a));await settle(page);
  await expect(page.locator(control('Notice'))).toContainText('Select Custom board sort');expect(fixture('read').positions).toEqual(saved);
  await click(page,'SortBoards');await click(page,'SortCustom');await expect(page.locator(handle(c))).toBeVisible();
  const from=await page.locator(tile(c)+' .weba-board-tile').boundingBox(),to=await page.locator(tile(a)).boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+8,to.y+8,{steps:10});await page.mouse.up();
  await expect.poll(()=>names(page)).toEqual(['Order Charlie','Order Alpha','Order Bravo']);
  await page.waitForTimeout(750);await page.setViewportSize({width:390,height:844});await click(page,'ToggleNavigation');
  const touch=await context.newCDPSession(page);
  async function gesture(from,to,cancel=false){const points=point=>[{x:Math.round(point.x),y:Math.round(point.y),id:1}];await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(from)});for(let n=1;n<=8;n++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points({x:from.x+(to.x-from.x)*n/8,y:from.y+(to.y-from.y)*n/8})});await page.waitForTimeout(25);}await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
  const start=await page.locator(handle(b)).boundingBox(),target=await page.locator(tile(c)).boundingBox();
  await gesture({x:start.x+start.width/2,y:start.y+start.height/2},{x:target.x+10,y:target.y+10});
  await expect.poll(()=>names(page)).toEqual(['Order Bravo','Order Charlie','Order Alpha']);
  const afterTouch=fixture('read').positions;expect(afterTouch).toEqual(clean(helpers.computeSortIndexMapping([b,c,a])));
  await page.waitForTimeout(750);const surface=await page.locator(tile(b)+' .weba-board-tile').boundingBox();
  await gesture({x:surface.x+surface.width/2,y:surface.y+40},{x:surface.x+surface.width/2,y:surface.y+12});expect(fixture('read').positions).toEqual(afterTouch);
  await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),wire(a,seeded.privateId));await settle(page);
  await expect(page.locator(control('Notice'))).toContainText('Invalid board order');expect(fixture('read').positions).toEqual(afterTouch);
  await saveOriginal.call({_id:'rest-member',profile:{boardSortIndex:afterTouch}},helpers.computeSortIndexMapping([a,b]));
  fixture('order-pair');expect(fixture('read').positions).toEqual(clean(merged));
  await page.bringToFront();await expect.poll(()=>names(page)).toEqual(['Order Alpha','Order Bravo','Order Charlie']);
  expect(errors).toEqual([]);
  console.log('Board order browser: readonly personal keyboard/mouse/trusted touch reorder, reload persistence, user isolation, sorted-mode/foreign forgery denial and ordinary touch no-write, original helper/mapping merge and external order refresh passed');
 }finally{if(context)await context.close();if(otherContext)await otherContext.close();if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
