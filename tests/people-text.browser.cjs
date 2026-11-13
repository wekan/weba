'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=extra=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',...extra}}));
 const seed=fixture({}),live=suffix=>fixture({WEBA_NATIVE_MODE:'live',WEBA_NATIVE_BOARD:String(seed.board),WEBA_NATIVE_CARD:String(seed.items[0].card),WEBA_NATIVE_SUFFIX:suffix}),first=live('A'),shown=t=>t.replaceAll('\0',''),c=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,errors=[];
 let browser,rosterContext,cardContext;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);rosterContext=await browser.newContext();cardContext=await browser.newContext();
  const settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(c(n)).click();await settle(p);};
  async function login(context){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.locator(input('WebTextName')).fill('rest-other');await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await expect(p.locator('.weba-content')).toBeVisible();return p;}
  const roster=await login(rosterContext),card=await login(cardContext);
  await roster.locator(`[data-context-kind="board"][data-context-id="${seed.board}"]`).click();await click(roster,'ContextMembers');await expect(roster.locator(c('MemberBoardName'))).toHaveText(shown(first.boardTitle));
  await roster.locator(input('MemberUsername')).fill('pending-invite');await settle(roster);
  await card.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);await card.locator(`.weba-card-link[data-card-id="${seed.items[0].card}"]`).click();await click(card,'CardAssigneesButton');await expect(card.locator(c('CardPeopleName'))).toHaveText(shown(first.cardTitle));
  await card.locator('[id$=".CardPersonChoice:select"]').selectOption({label:'rest-native-reader'});await settle(card);
  const second=live('B');await roster.bringToFront();await expect(roster.locator(c('MemberBoardName'))).toHaveText(shown(second.boardTitle),{timeout:15000});await expect(roster.locator(input('MemberUsername'))).toHaveValue('pending-invite');
  await card.bringToFront();await expect(card.locator(c('CardPeopleName'))).toHaveText(shown(second.cardTitle),{timeout:15000});await expect(card.locator('[id$=".CardPersonChoice:select"]')).toHaveValue('rest-native-reader');
  await click(card,'CloseCardPeople');await click(card,'CardMembersButton');await expect(card.locator(c('CardPeopleName'))).toHaveText(shown(second.cardTitle));await expect(card.locator(c('CardPeoplePanel')+' tag')).toHaveCount(0);await expect(roster.locator(c('MembersPanel')+' tag')).toHaveCount(0);
  await card.reload();await card.locator(`.weba-card-link[data-card-id="${seed.items[0].card}"]`).click();await click(card,'CardMembersButton');await expect(card.locator(c('CardPeopleName'))).toHaveText(shown(second.cardTitle));expect(errors).toEqual([]);
  console.log('People complete-text browser: roster/member/assignee captions retain NUL suffix text, external suffix-only heartbeat renames refresh open panes, pending invite and assignee choice survive, literal markup and reload passed');
 }finally{if(rosterContext)await rosterContext.close();if(cardContext)await cardContext.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
