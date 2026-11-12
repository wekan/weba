// Native people/roster panes in two isolated real browser contexts.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP live people: original Playwright dependency unavailable; pane coverage remains unverified');return;}
 const {chromium,request,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS),board=String(fixture.otherBoardId),card=String(fixture.otherCardId),list=String(fixture.otherListId);
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL});
 let browser,first,second;
 const errors=[];
 const control=name=>`[id$=".${name}"]`,input=name=>`[id$=".${name}:entry"],textarea[id$=".${name}"]`;
 const settle=page=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(page,name)=>{await settle(page);await page.locator(control(name)).click();await settle(page);};
 const fill=async(page,name,value)=>{await settle(page);await page.locator(input(name)).fill(value);await settle(page);};
 const choice=async(page,name,label)=>{await page.locator(`[id$=".${name}:select"]`).selectOption({label});await settle(page);};
 const selectRow=async(page,tree,text)=>{await page.locator(control(tree)+' tr[id]').filter({hasText:text}).last().click();await settle(page);};
 async function login(username){const response=await api.post('/users/login',{data:{username,password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);const data=await response.json();secrets.push(data.token);return data;}
 try{
  execFileSync(process.env.GBX,['-s','ApiFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_TEST_MODE:'seed-user',WEBA_TEST_USER:'rest-people-extra',WEBA_TEST_ADMIN:'0',WEBA_API_REQUEST:'0'}});
  const admin=await login('rest-owner'),headers={Authorization:'Bearer '+admin.token};
  const memberRoute=name=>`/api/boards/${board}/members/${name}`;
  for(const [name,role] of [['rest-other','admin'],['rest-member','normal'],['rest-people-extra','normal']]){
   expect((await api.post(memberRoute(name)+'/add',{headers,data:{action:'add',role}})).status()).toBe(200);
   expect((await api.post(memberRoute(name),{headers,data:{role}})).status()).toBe(200);
  }
  const cardRoute=`/api/boards/${board}/lists/${list}/cards/${card}`;
  expect((await api.put(cardRoute,{headers,data:{members:[],assignees:['rest-other']}})).status()).toBe(200);
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);first=await browser.newContext();second=await browser.newContext();
  async function open(context,username){const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(process.env.WEBA_TEST_URL);await page.waitForFunction(()=>window.webaI18n);await page.evaluate(()=>webaI18n.setLanguage('en'));await fill(page,'WebTextName',username);await fill(page,'WebTextPass',process.env.WEBA_TEST_PASSWORD);await click(page,'WebButtonLogin');await page.locator(`[data-board-key="b${board}"]`).click();await settle(page);await page.locator(`.weba-report .weba-card[data-card-id="${card}"] strong`).click();await settle(page);await click(page,'CardMembersButton');return page;}
  const owner=await open(first,'rest-other'),member=await open(second,'rest-member');
  await choice(owner,'CardPersonChoice','rest-member');
  expect((await api.post(cardRoute+'/members/rest-people-extra',{headers})).status()).toBe(200);
  await owner.bringToFront();await expect(owner.locator(control('CardPeopleTree'))).toContainText('rest-people-extra');
  await expect(owner.locator('[id$=".CardPersonChoice:select"]')).toHaveValue('rest-member');
  await click(owner,'AddCardPerson');await member.bringToFront();await expect(member.locator(control('CardPeopleTree'))).toContainText('rest-member');
  await selectRow(owner,'CardPeopleTree','rest-member');
  expect((await api.delete(cardRoute+'/members/rest-member',{headers})).status()).toBe(200);
  await owner.bringToFront();await expect(owner.locator(control('CardPeopleTree'))).not.toContainText('rest-member');
  await expect(owner.locator(control('RemoveCardPerson'))).toBeDisabled();
  await choice(owner,'CardPersonChoice','rest-member');
  expect((await api.post(cardRoute+'/members/rest-member',{headers})).status()).toBe(200);
  await expect(owner.locator('[id$=".CardPersonChoice:select"]')).toHaveValue('');
  await expect(owner.locator(control('AddCardPerson'))).toBeDisabled();
  await choice(owner,'CardPersonChoice','rest-other');await expect(owner.locator(control('AddCardPerson'))).toBeEnabled();
  expect((await api.post(memberRoute('rest-member'),{headers,data:{role:'readonly'}})).status()).toBe(200);
  await member.bringToFront();await expect(member.locator(control('AddCardPerson'))).toBeHidden();await expect(member.locator(control('RemoveCardPerson'))).toBeHidden();
  const beforeDenied=await (await api.get(cardRoute,{headers})).json();
  await member.evaluate(()=>gw.raise(document.querySelector('[id$=".AddCardPerson"]').id,'click',[]));await settle(member);
  await expect(member.locator(control('Notice'))).toContainText('Board permission denied');
  expect(await (await api.get(cardRoute,{headers})).json()).toEqual(beforeDenied);
  await click(member,'CloseCardPeople');await click(member,'CardAssigneesButton');
  expect((await api.put(cardRoute,{headers,data:{assignees:['rest-other','rest-people-extra','rest-people-extra']}})).status()).toBe(200);
  await expect(member.locator(control('CardPeopleTree')+' tr[id]').filter({hasText:'rest-people-extra'})).toHaveCount(1);
  expect((await api.post(memberRoute('rest-member'),{headers,data:{role:'normal'}})).status()).toBe(200);
  await expect(member.locator(control('AddCardPerson'))).toBeVisible();
  expect((await api.post(memberRoute('rest-member'),{headers,data:{role:'normalAssignedOnly'}})).status()).toBe(200);
  await expect(member.locator(control('CardPeoplePanel'))).toBeHidden();await expect(member.locator(control('Editor'))).toBeHidden();
  await expect(member.locator(input('CardTitle'))).toHaveValue('');
  await expect(member.locator(control('CardPeopleName'))).toHaveText('');
  await expect(member.locator('[id$=".CardPersonChoice:select"] option')).toHaveCount(0);
  await click(owner,'CloseCardPeople');await click(owner,'CloseEditor');await click(owner,'Home');
  await owner.locator(`[data-context-kind="board"][data-context-id="${board}"]`).click();await settle(owner);await click(owner,'ContextMembers');
  await selectRow(owner,'MembersTree','rest-member');
  expect((await api.post(memberRoute('rest-member'),{headers,data:{role:'readonly'}})).status()).toBe(200);
  await owner.bringToFront();await expect(owner.locator('[id$=".MemberRole:select"]')).toHaveValue('Read only');
  await fill(owner,'MemberUsername','pending-invite');await choice(owner,'MemberRole','Normal');
  expect((await api.post(memberRoute('rest-member'),{headers,data:{role:'commentonly'}})).status()).toBe(200);
  await expect(owner.locator(control('MembersTree'))).toContainText('Comment only');
  await expect(owner.locator(input('MemberUsername'))).toHaveValue('pending-invite');await expect(owner.locator('[id$=".MemberRole:select"]')).toHaveValue('Normal');
  // Force a new native tree selection: re-clicking its existing key emits no Select.
  await selectRow(owner,'MembersTree','rest-other');
  await selectRow(owner,'MembersTree','rest-member');
  await expect(owner.locator(input('MemberUsername'))).toHaveValue('rest-member');
  expect((await api.post(memberRoute('rest-member')+'/remove',{headers,data:{action:'remove'}})).status()).toBe(200);
  await expect(owner.locator(control('MembersTree'))).not.toContainText('rest-member');
  await expect(owner.locator(input('MemberUsername'))).toHaveValue('');await expect(owner.locator(control('SaveMember'))).toBeDisabled();await expect(owner.locator(control('RemoveMember'))).toBeDisabled();
  // Preserve the last-admin invariant while exercising live owner demotion.
  expect((await api.post(memberRoute('rest-people-extra'),{headers,data:{role:'admin'}})).status()).toBe(200);
  expect((await api.post(memberRoute('rest-other'),{headers,data:{role:'readonly'}})).status()).toBe(200);
  await expect(owner.locator(control('SaveMember'))).toBeHidden();await expect(owner.locator(input('MemberUsername'))).toHaveJSProperty('readOnly',true);
  expect((await api.post(memberRoute('rest-other')+'/remove',{headers,data:{action:'remove'}})).status()).toBe(200);
  await expect(owner.locator(control('MembersPanel'))).toBeHidden();
  expect(errors).toEqual([]);
  console.log('Live people browser: card members/assignees, stable/missing candidates and selection, duplicate rows, role changes, home roster updates, preserved invitation drafts, removal/demotion/revocation passed');
 }finally{if(first)await first.close();if(second)await second.close();if(browser)await browser.close();await api.dispose();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
