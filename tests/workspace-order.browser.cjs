// Native personal workspace ordering with real mouse, keyboard and CDP touch.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original Playwright fixtures unavailable');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const helper=require(path.join(source,'models/lib/workspacesTree.js'));
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const ids=fixture('seed-workspace-order').spaceIds;
 const foreign=fixture('create-space','rest-other',{WEBA_SPACE_NAME:'Drag foreign'}).spaceId;
 const foreignBefore=fixture('read','rest-other').tree;
 const control=name=>`[id$=".${name}"]`,entry=name=>`[id$=".${name}:entry"]`;
 let browser,context;const errors=[];
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const click=async name=>{await settle();await page.locator(control(name)).click();await settle();};
  const row=id=>page.locator(`.weba-space-row[data-workspace-id="${id}"]`),handle=id=>row(id).locator('.weba-space-drag');
  const tree=()=>fixture('read').tree;
  const expected=(dragged,target,position)=>helper.moveWorkspace(tree(),String(dragged),String(target),position);
  async function expectTree(next){
    await expect.poll(tree).toEqual(next);
    const folded=fixture('read').collapsed,names=[],hierarchy=[];
    function visit(nodes,parent='0'){for(const node of nodes){names.push(node.name);hierarchy.push({id:String(node.id),parent});if(!folded[node.id])visit(node.children||[],String(node.id));}}
    visit(next);
    await expect(page.locator('.weba-space-row:not(.weba-drag-ghost) .weba-space-open')).toHaveText(names);
    await expect.poll(()=>page.locator('.weba-space-row:not(.weba-drag-ghost)').evaluateAll(rows=>rows.map(row=>({id:row.dataset.workspaceId,parent:row.dataset.workspaceParent})))).toEqual(hierarchy);
  }

  async function mouse(dragged,target,position,fromHandle=false){
    await settle();await expect(row(dragged)).toBeVisible();await expect(row(target)).toBeVisible();
    const start=await row(dragged).locator(fromHandle?'.weba-space-drag':'.weba-space-open').boundingBox(),dest=await row(target).boundingBox();
    const y=position==='before'?dest.y+3:position==='after'?dest.y+dest.height-3:dest.y+dest.height/2;
    await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,y,{steps:10});await page.mouse.up();
  }
  await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));
  await page.locator(entry('WebTextName')).fill('rest-member');await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click('WebButtonLogin');
  await expect(handle(ids.c)).toBeVisible();
  // Make SQL commit visibility precede the native DOM acknowledgement. A
  // hierarchy change may leave flattened labels unchanged; waits must inspect it.
  await page.route('**/x',async route=>{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({response});});
  let next=expected(ids.c,ids.a,'before');await mouse(ids.c,ids.a,'before');await expectTree(next);
  next=expected(ids.c,ids.b,'inside');await mouse(ids.c,ids.b,'inside');await expectTree(next);await expect(row(ids.c)).toHaveAttribute('data-workspace-parent',String(ids.b));
  next=expected(ids.c,ids.b,'after');await handle(ids.c).press('ArrowLeft');await expectTree(next);await expect(handle(ids.c)).toBeFocused();
  next=expected(ids.c,ids.b,'before');await page.keyboard.press('ArrowUp');await expectTree(next);await expect(handle(ids.c)).toBeFocused();
  next=expected(ids.c,ids.a,'inside');await page.keyboard.press('ArrowRight');await expectTree(next);await expect(handle(ids.c)).toBeFocused();
  next=expected(ids.c,ids.a,'after');await page.keyboard.press('ArrowLeft');await expectTree(next);await expect(handle(ids.c)).toBeFocused();
  await page.unrouteAll({behavior:'wait'});
  const beforeCycle=tree();await mouse(ids.a,ids.child,'inside',true);expect(tree()).toEqual(beforeCycle);await expect(page.locator('.weba-space-drop-inside')).toHaveCount(0);
  const wire=(id,target,position)=>['workspace',...([id,target,position,''].map(value=>Buffer.from(String(value)).toString('base64')))].join('|');
  await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),wire(ids.a,ids.child,'inside'));await settle();await expect(page.locator(control('Notice'))).toContainText('Invalid workspace move');expect(tree()).toEqual(beforeCycle);
  await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),wire(ids.c,foreign,'inside'));await settle();await expect(page.locator(control('Notice'))).toContainText('Workspace not found');expect(tree()).toEqual(beforeCycle);
  await page.waitForTimeout(750);await page.setViewportSize({width:390,height:844});
  if(await page.locator(control('PageSidebar')).isVisible())await click('CloseSidebar');
  if(!await page.locator(control('LeftNavigation')).isVisible())await click('ToggleNavigation');
  const touch=await context.newCDPSession(page);
  async function gesture(start,dest,cancel=false){
    const points=p=>[{x:Math.round(p.x),y:Math.round(p.y),id:1}];
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(start)});
    for(let n=1;n<=8;n++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points({x:start.x+(dest.x-start.x)*n/8,y:start.y+(dest.y-start.y)*n/8})});await page.waitForTimeout(25);}
    await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
  }
  let start=await handle(ids.c).boundingBox(),dest=await row(ids.b).boundingBox();next=expected(ids.c,ids.b,'after');
  await gesture({x:start.x+start.width/2,y:start.y+start.height/2},{x:dest.x+dest.width/2,y:dest.y+dest.height-3});await expectTree(next);
  await page.waitForTimeout(750);start=await row(ids.c).locator('.weba-space-open').boundingBox();const beforeScroll=tree();await gesture({x:start.x+start.width/2,y:start.y+start.height/2},{x:start.x+start.width/2,y:start.y+start.height/2-28});expect(tree()).toEqual(beforeScroll);
  start=await handle(ids.c).boundingBox();dest=await row(ids.a).boundingBox();await gesture({x:start.x+start.width/2,y:start.y+start.height/2},{x:dest.x+dest.width/2,y:dest.y+dest.height/2},true);expect(tree()).toEqual(beforeScroll);await expect(page.locator('.weba-drag-ghost')).toHaveCount(0);
  await page.reload();await expect(handle(ids.c)).toBeVisible();expect(tree()).toEqual(beforeScroll);
  await row(ids.a).locator('.weba-space-collapse').click();await expect(row(ids.child)).toHaveCount(0);
  next=expected(ids.c,ids.b,'before');await handle(ids.c).press('ArrowUp');await expectTree(next);await expect(handle(ids.c)).toBeFocused();
  next=expected(ids.c,ids.a,'inside');await page.keyboard.press('ArrowRight');await expectTree(next);await expect(row(ids.c)).toHaveCount(0);await expect(handle(ids.a)).toBeFocused();
  expect(fixture('read').collapsed[String(ids.a)]).toBe(true);await row(ids.a).locator('.weba-space-collapse').click();await expect(row(ids.c)).toBeVisible();
  await click('AccountToggle');await click('Profile');await expect(handle(ids.c)).toBeHidden();
  const beforeProfile=tree();await page.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),wire(ids.c,ids.b,'before'));await settle();await expect(page.locator(control('Notice'))).toContainText('Select All Boards first');expect(tree()).toEqual(beforeProfile);
  await click('Home');await click('Archive');await expect(handle(ids.b)).toBeVisible();
  next=expected(ids.b,ids.a,'before');await handle(ids.b).press('ArrowUp');await expectTree(next);
  expect(fixture('read','rest-other').tree).toEqual(foreignBefore);
  for(const root of tree())if(root.name.startsWith('Drag '))fixture('delete-space','rest-member',{WEBA_SPACE_ID:root.id});
  fixture('delete-space','rest-other',{WEBA_SPACE_ID:String(foreign)});
  expect(errors).toEqual([]);
  console.log('Workspace order browser: original-helper mouse/keyboard/trusted touch trees, reorder/nesting/outdent, acknowledged hierarchy with delayed native replies, repeated focus, collapsed-target behavior, cycle/foreign/non-overview forgery denial, scroll/cancel/reload/isolation and Archive ordering passed');
 }finally{if(context){for(const page of context.pages())await page.unrouteAll({behavior:'wait'});await context.close();}if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
