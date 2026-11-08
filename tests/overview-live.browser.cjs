// Real native overview updates in independent browser contexts.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP live overview: original Playwright dependency unavailable; overview coverage remains unverified');return;}
 const {chromium,request,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS),board=String(fixture.otherBoardId);
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL});
 const control=name=>`[id$=".${name}"]`,input=name=>`[id$=".${name}:entry"],textarea[id$=".${name}"]`;
 const tile=id=>`.weba-board-tile[data-board-key="b${id}"]`;
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
 const fill=async(page,name,text)=>{await settle(page);await page.locator(input(name)).fill(text);await settle(page);};
 const menu=async(page,id)=>{await page.locator(`[data-context-kind="board"][data-context-id="${id}"]`).click();await settle(page);};
 let browser,first,second;
 const errors=[];
 try{
  const login=await api.post('/users/login',{data:{username:'rest-owner',password:process.env.WEBA_TEST_PASSWORD}});expect(login.status()).toBe(200);
  const account=await login.json();secrets.push(account.token);const headers={Authorization:'Bearer '+account.token};
  // Earlier live cases revoke these actors: restore explicit roles for this case.
  for(const [username,role] of [['rest-other','admin'],['rest-member','normal']]){
   expect((await api.post(`/api/boards/${board}/members/${username}/add`,{headers,data:{action:'add',role}})).status()).toBe(200);
   expect((await api.post(`/api/boards/${board}/members/${username}`,{headers,data:{role}})).status()).toBe(200);
  }
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);first=await browser.newContext();second=await browser.newContext();
  async function open(context,username){const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await fill(page,'WebTextName',username);await fill(page,'WebTextPass',process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');await expect(page.locator(tile(board))).toBeVisible();return page;}
  const owner=await open(first,'rest-other'),member=await open(second,'rest-member');
  await menu(owner,board);await click(owner,'ContextRename');await fill(owner,'ActionText','Live overview renamed board');await click(owner,'ActionConfirm');
  await expect(owner.locator(tile(board))).toHaveText('Live overview renamed board');
  await member.bringToFront();await expect(member.locator(tile(board))).toHaveText('Live overview renamed board');
  await menu(owner,board);await click(owner,'ContextColor');await fill(owner,'ActionText','#223344');await click(owner,'ActionConfirm');
  await member.bringToFront();await expect(member.locator(tile(board))).toHaveCSS('background-color','rgb(34, 51, 68)');
  await member.evaluate(id=>window.overviewTile=document.querySelector('.weba-board-tile[data-board-key="b'+id+'"]'),board);
  await member.waitForTimeout(2300);await settle(member);
  expect(await member.evaluate(()=>window.overviewTile===document.querySelector('.weba-board-tile[data-board-key="'+window.overviewTile.dataset.boardKey+'"]'))).toBe(true);
  // Keep Starred under observation when an external membership is revoked.
  await menu(member,board);await click(member,'ContextStar');await click(member,'Starred');await expect(member.locator(tile(board))).toBeVisible();
  // External role removal must remove the overview tile and its native tree row.
  expect((await api.post(`/api/boards/${board}/members/rest-member/remove`,{headers,data:{action:'remove'}})).status()).toBe(200);
  await expect(member.locator(tile(board))).toHaveCount(0);
  await expect(member.locator(control('Boards')+' tr[id]').filter({hasText:'Live overview renamed board'})).toHaveCount(0);
  expect((await api.post(`/api/boards/${board}/members/rest-member/add`,{headers,data:{action:'add',role:'normal'}})).status()).toBe(200);
  await click(member,'Home');await expect(member.locator(tile(board))).toBeVisible();
  await menu(owner,board);await click(owner,'ContextArchive');
  await member.bringToFront();await expect(member.locator(tile(board))).toHaveCount(0);
  await click(owner,'Archive');await click(member,'Archive');await expect(member.locator(tile(board))).toBeVisible();
  await menu(owner,board);await click(owner,'ContextRestore');
  await member.bringToFront();await expect(member.locator(tile(board))).toHaveCount(0);
  await click(member,'Home');await expect(member.locator(tile(board))).toBeVisible();
  // Add a new board without granting any reader membership, then grant it live.
  await click(owner,'Home');await click(owner,'AddBoard');await fill(owner,'BoardTitle','Live new shared board');await click(owner,'NewBoard');
  const added=owner.locator('.weba-board-tile').filter({hasText:'Live new shared board'});
  const addedId=(await added.getAttribute('data-board-key')).slice(1);
  await member.bringToFront();await member.waitForTimeout(1300);await expect(member.locator(tile(addedId))).toHaveCount(0);
  expect((await api.post(`/api/boards/${addedId}/members/rest-member/add`,{headers,data:{action:'add',role:'readonly'}})).status()).toBe(200);
  await expect(member.locator(tile(addedId))).toHaveText('Live new shared board');
  await expect(member.locator(control('Boards'))).toContainText('Live new shared board');
  expect(errors).toEqual([]);
  console.log('Live overview browser: external rename/color, stable idle DOM, Starred revocation, membership grants, new private boards and archive/restore update tiles/navigation passed');
 }finally{if(first)await first.close();if(second)await second.close();if(browser)await browser.close();await api.dispose();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
