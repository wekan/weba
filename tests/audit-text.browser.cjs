'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=extra=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',...extra}}));
 const seed=fixture({}),audit=fixture({WEBA_NATIVE_MODE:'audit-seed',WEBA_NATIVE_BOARD:String(seed.board),WEBA_NATIVE_CARD:String(seed.items[0].card)}),shown=t=>t.replaceAll('\0',''),c=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,errors=[];
 let browser,ownerContext,adminContext;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);ownerContext=await browser.newContext({viewport:{width:1440,height:1000}});adminContext=await browser.newContext();
  const settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(c(n)).click();await settle(p);};
  async function login(context,user){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.locator(input('WebTextName')).fill(user);await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await expect(p.locator('.weba-content')).toBeVisible();return p;}
  const owner=await login(ownerContext,'rest-other');await owner.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);await owner.locator(`.weba-card[data-card-id="${seed.items[0].card}"] .weba-card-menu`).click();await click(owner,'ContextHistory');await expect(owner.locator(c('BrowserTree'))).toContainText(shown(audit.message));await expect(owner.locator(c('BrowserTree')+' tag')).toHaveCount(0);await click(owner,'CloseBrowser');
  if(!await owner.locator(c('Activities')).isVisible())await click(owner,'SidebarToggle');await click(owner,'Activities');await expect(owner.locator('.weba-content')).toContainText(shown(audit.message));await expect(owner.locator('.weba-content tag')).toHaveCount(0);
  const admin=await login(adminContext,'rest-owner');await click(admin,'AccountToggle');await click(admin,'Admin');await click(admin,'RecoveryEvents');await expect(admin.locator(c('RecoveryTree'))).toContainText(shown(audit.actor));await expect(admin.locator(c('RecoveryTree'))).toContainText(shown(audit.detail));await expect(admin.locator(c('RecoveryTree')+' tag')).toHaveCount(0);
  await owner.evaluate(()=>gw.raise(document.querySelector('[id$=".RecoveryEvents"]').id,'click',[]));await settle(owner);await expect(owner.locator(c('RecoveryPanel'))).toBeHidden();await expect(owner.locator('body')).not.toContainText(shown(audit.detail));
  await admin.reload();await click(admin,'AccountToggle');await click(admin,'Admin');await click(admin,'RecoveryEvents');await expect(admin.locator(c('RecoveryTree'))).toContainText(shown(audit.detail));expect(errors).toEqual([]);
  console.log('Audit complete-text browser: actual card history, board activities and admin recovery show complete NUL suffix messages/actors/details literally; normal-member recovery forgery refused and durable reload passed');
 }finally{if(ownerContext)await ownerContext.close();if(adminContext)await adminContext.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
