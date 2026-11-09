// Single-board personal placement and managed archive/restore through real UI.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original Playwright fixture dependency unavailable');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,user='rest-member',extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','BoardCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CATALOG_MODE:mode,WEBA_TEST_USER:user,...extra}}));
 const seeded=fixture('seed-board-drops','rest-other'),id=String(seeded.dropBoard),ownerSpace=String(seeded.ownerSpace);
 const readerSpace=String(fixture('create-space','rest-member',{WEBA_SPACE_NAME:'Drop Reader Workspace'}).spaceId);
 const privateId=String(fixture('private-drop-board','rest-owner').privateDropBoard);
 const control=name=>`[id$=".${name}"]`,entry=name=>`[id$=".${name}:entry"]`,tile=`.weba-board-tile-group[data-board-id="${id}"]`;
 const space=id=>`.weba-space-row[data-workspace-id="${id}"]`;
 const state=user=>fixture('read',user);
 let browser,memberContext,ownerContext;const errors=[];
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);memberContext=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});ownerContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
  async function login(ctx,user){const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await page.locator(entry('WebTextName')).fill(user);await page.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');await click(page,'SortBoards');await click(page,'SortTitleAsc');return page;}
  const member=await login(memberContext,'rest-member'),owner=await login(ownerContext,'rest-other');
  await click(owner,'HeaderSearch');await owner.locator(entry('BoardSearch')).fill('Drop Board Alpha');await expect(owner.locator(tile)).toBeVisible();await click(owner,'CloseSidebar');
  async function drop(page,target,confirm){
    await page.bringToFront();await expect(page.locator(tile)).toBeVisible();await expect(page.locator(target)).toBeVisible();
    const start=await page.locator(tile+' .weba-board-drag').boundingBox(),dest=await page.locator(target).boundingBox();
    if(confirm!==undefined)page.once('dialog',async dialog=>{expect(dialog.type()).toBe('confirm');expect(dialog.message()).toBe('Are you sure you want to archive this board?');await (confirm?dialog.accept():dialog.dismiss());});
    await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:12});await page.mouse.up();
    // The engine deliberately suppresses the release click for 700 ms.
    await page.waitForTimeout(750);await settle(page);
  }
  await drop(member,space(readerSpace));await expect.poll(()=>state('rest-member').rawAssignments[id]).toBe(readerSpace);await expect(member.locator(tile)).toBeHidden();
  await member.locator(space(readerSpace)+' .weba-space-open').click();await expect(member.locator(tile)).toBeVisible();
  await drop(member,control('Starred'));await expect.poll(()=>state('rest-member').rawStars[id]).toBe('1');expect(state('rest-member').rawAssignments[id]).toBe(readerSpace);await expect(member.locator(tile)).toBeVisible();
  await click(member,'Starred');await expect(member.locator(tile)).toBeVisible();await drop(member,control('Remaining'));await expect.poll(()=>state('rest-member').rawAssignments[id]).toBeUndefined();expect(state('rest-member').rawStars[id]).toBe('1');
  await click(member,'Remaining');await expect(member.locator(tile)).toBeVisible();
  await drop(member,control('Archive'),false);expect(state('rest-member').rawArchived[id]).toBe(false);
  await drop(member,control('Archive'),true);await expect(member.locator(control('Notice'))).toContainText('Board permission denied');expect(state('rest-member').rawArchived[id]).toBe(false);
  await drop(owner,space(ownerSpace));await expect.poll(()=>state('rest-other').rawAssignments[id]).toBe(ownerSpace);
  await drop(owner,control('Archive'),true);await expect.poll(()=>state('rest-other').rawArchived[id]).toBe(true);expect(state('rest-other').rawAssignments[id]).toBe(ownerSpace);await expect(owner.locator(tile)).toBeHidden();
  await click(owner,'Archive');await expect(owner.locator(tile)).toBeVisible(); // Assigned archives must remain reachable.
  await member.bringToFront();await click(member,'Archive');await expect(member.locator(tile)).toBeVisible();
  await drop(member,control('Remaining'));await expect(member.locator(control('Notice'))).toContainText('Board permission denied');expect(state('rest-member').rawArchived[id]).toBe(true);expect(state('rest-member').rawAssignments[id]).toBeUndefined();
  await drop(owner,space(ownerSpace));await expect.poll(()=>state('rest-other').rawArchived[id]).toBe(false);expect(state('rest-other').rawAssignments[id]).toBe(ownerSpace);await expect(owner.locator(tile)).toBeHidden();
  await click(owner,'Remaining');await expect(owner.locator(tile)).toBeVisible();await drop(owner,control('Archive'),true);await click(owner,'Archive');await expect(owner.locator(tile)).toBeVisible();
  await drop(owner,control('Remaining'));await expect.poll(()=>state('rest-other').rawArchived[id]).toBe(false);expect(state('rest-other').rawAssignments[id]).toBeUndefined();
  await member.bringToFront();await click(member,'Starred');await expect(member.locator(tile)).toBeVisible();
  await member.setViewportSize({width:390,height:844});if(!await member.locator(control('LeftNavigation')).isVisible())await click(member,'ToggleNavigation');
  const touch=await memberContext.newCDPSession(member);
  async function gesture(from,to,cancel=false){const points=p=>[{x:Math.round(p.x),y:Math.round(p.y),id:1}];await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(from)});for(let n=1;n<=8;n++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points({x:from.x+(to.x-from.x)*n/8,y:from.y+(to.y-from.y)*n/8})});await member.waitForTimeout(25);}await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
  let start=await member.locator(tile+' .weba-board-drag').boundingBox(),dest=await member.locator(space(readerSpace)).boundingBox();
  await gesture({x:start.x+start.width/2,y:start.y+start.height/2},{x:dest.x+dest.width/2,y:dest.y+dest.height/2});await expect.poll(()=>state('rest-member').rawAssignments[id]).toBe(readerSpace);expect(state('rest-member').rawStars[id]).toBe('1');expect(state('rest-other').rawAssignments[id]).toBeUndefined();
  await member.waitForTimeout(750);start=await member.locator(tile+' .weba-board-tile').boundingBox();const before=state('rest-member').rawAssignments;await gesture({x:start.x+start.width/2,y:start.y+30},{x:start.x+start.width/2,y:start.y+2});expect(state('rest-member').rawAssignments).toEqual(before);
  const wire=(board,target,spaceId,reserved='')=>['board-drop',...[board,target,spaceId,reserved].map(value=>Buffer.from(String(value)).toString('base64'))].join('|');
  for(const [payload,message] of [[wire(id,'workspace',ownerSpace),'Workspace not found'],[wire(privateId,'remaining','0'),'Invalid board drop'],[wire(id,'remaining','0','bad-reserved'),'Invalid board drop']]){await member.evaluate(value=>gw.update(document.querySelector('[id$=".DragAction"]').id,'text',value),payload);await settle(member);await expect(member.locator(control('Notice'))).toContainText(message);expect(state('rest-member').rawAssignments).toEqual(before);}
  await member.reload();await expect(member.locator(tile)).toBeVisible();expect(state('rest-member').rawAssignments[id]).toBe(readerSpace);
  fixture('delete-space','rest-member',{WEBA_SPACE_ID:readerSpace});fixture('delete-space','rest-other',{WEBA_SPACE_ID:ownerSpace});
  expect(errors).toEqual([]);
  console.log('Board drop browser: sorted native mouse/trusted touch workspace/Remaining/add-only Starred, personal isolation, archive confirm/cancel/readonly denial, assigned Archive visibility, managed restoration, scroll/reload and foreign/private/reserved forgery guards passed');
 }finally{if(memberContext)await memberContext.close();if(ownerContext)await ownerContext.close();if(browser)await browser.close();}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
