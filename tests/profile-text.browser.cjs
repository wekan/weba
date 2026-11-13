'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=mode=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_NATIVE_MODE:mode}}));
 const initial=fixture('profile-seed').fullname,c=n=>`[id$=".${n}"]`,input=n=>`[id$=".${n}:entry"]`,errors=[];
 let browser,context,adminContext;
 try{
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext();adminContext=await browser.newContext();
  const settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0),click=async(p,n)=>{await settle(p);await p.locator(c(n)).click();await settle(p);};
  async function login(ctx,user){const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.locator(input('WebTextName')).fill(user);await p.locator(input('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await expect(p.locator('.weba-content')).toBeVisible();return p;}
  const page=await login(context,'rest-other');await click(page,'AccountToggle');await click(page,'Profile');const fullname=page.locator(input('Fullname'));
  await expect(fullname).toHaveValue(initial);const changed=initial.slice(0,-1)+'B';await fullname.evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},changed);await settle(page);await page.waitForTimeout(1300);await expect(fullname).toHaveValue(changed);await click(page,'SaveProfile');expect(fixture('profile-read').fullname).toBe(changed);await expect(fullname).toHaveValue(changed);
  await click(page,'Home');await click(page,'AccountToggle');await click(page,'Profile');await expect(fullname).toHaveValue(changed);
  await fullname.fill('');await click(page,'SaveProfile');expect(fixture('profile-read').fullname).toBe('');await click(page,'Home');await click(page,'AccountToggle');await click(page,'Profile');await expect(fullname).toHaveValue('');await fullname.evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},changed);await click(page,'SaveProfile');expect(fixture('profile-read').fullname).toBe(changed);
  const admin=await login(adminContext,'rest-owner');await click(admin,'AccountToggle');await click(admin,'Admin');await expect(admin.locator('.weba-content table tr').filter({hasText:'rest-other'})).toContainText(changed.replaceAll('\0',''));await expect(admin.locator('.weba-content tag')).toHaveCount(0);
  // Reusing the old hidden form's native control IDs must not edit the profile.
  const stale=await page.evaluate(()=>({field:document.querySelector('[id$=".Fullname:entry"]').id.replace(/:entry$/,''),save:document.querySelector('[id$=".SaveProfile"]').id}));await click(page,'Home');await page.evaluate(ids=>{gw.update(ids.field,'text','FORGED OFF-VIEW PROFILE');gw.raise(ids.save,'click',[]);},stale);await settle(page);expect(fixture('profile-read').fullname).toBe(changed);
  await page.reload();await click(page,'AccountToggle');await click(page,'Profile');await expect(fullname).toHaveValue(changed);expect(errors).toEqual([]);
  console.log('Profile complete-text browser: exact encoded initial/save/reopen/reload names, explicit clearing/resave, NUL suffix SQL persistence, dirty heartbeat stability, full literal administrator user list and stale hidden form refusal passed');
 }finally{if(context)await context.close();if(adminContext)await adminContext.close();if(browser)await browser.close();}
})().catch(e=>{let message=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
