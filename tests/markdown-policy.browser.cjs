'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original Playwright required');
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 const fixture=(mode,raw=false,space='')=>JSON.parse(execFileSync(process.env.GBX,['-s','MarkdownPolicyFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_MARKDOWN_MODE:mode,WEBA_MARKDOWN_RAW:raw?'1':'0',WEBA_MARKDOWN_SPACE:String(space)}}));
 fixture('save',false);const seeded=fixture('seed');
 const browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL),contexts=[],errors=[];
 const control=n=>`[id$=".${n}"]`,entry=n=>`[id$=".${n}:entry"]`,settle=p=>p.waitForFunction(()=>window.gw&&gw.commands.length===0);
 const click=async(p,n)=>{await settle(p);await p.locator(control(n)).click();await settle(p);};
 const forge=async(p,n)=>{await p.evaluate(n=>gw.raise(document.querySelector(`[id$=".${n}"]`).id,'click',[]),n);await settle(p);};
 try{
  async function login(user){const c=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.WEBA_TEST_URL);await p.waitForFunction(()=>window.webaI18n);await p.evaluate(()=>webaI18n.setLanguage('en'));await p.locator(entry('WebTextName')).fill(user);await p.locator(entry('WebTextPass')).fill(process.env.WEBA_TEST_PASSWORD);await click(p,'WebButtonLogin');await expect(p.locator(control('Home'))).toBeVisible();return p;}
  const reader=await login('rest-member'),admin=await login('rest-owner');
  const icon=reader.locator('.weba-space-row').filter({has:reader.locator('.workspace-name',{hasText:'Markdown policy workspace'})}).locator('.workspace-icon-value');
  await expect(icon.locator('strong')).toHaveText('Policy bold');
  const before=fixture('read');await forge(reader,'MarkdownSettings');await expect(reader.locator(control('MarkdownPanel'))).toBeHidden();await forge(reader,'SaveMarkdown');await expect(reader.locator(control('Notice'))).toContainText('Administrator required');expect(fixture('read')).toEqual(before);
  await click(admin,'AccountToggle');await click(admin,'Admin');await click(admin,'MarkdownSettings');const flag=admin.locator(control('AlwaysShowCodeAsText')+' input');await expect(flag).not.toBeChecked();
  await flag.check();await settle(admin);await click(admin,'SaveMarkdown');expect(fixture('read').raw).toBe(true);expect(fixture('read').actor).toBe('rest-owner');expect(fixture('read').changed).toBeGreaterThan(0);await expect(icon.locator('pre')).toHaveText('**Policy bold**');await expect(icon.locator('strong')).toHaveCount(0);
  await reader.reload();await expect(icon.locator('pre')).toHaveText('**Policy bold**');
  fixture('save',false);await expect(flag).not.toBeChecked();await expect(icon.locator('strong')).toHaveText('Policy bold');
  await flag.check();await settle(admin);fixture('save',false);await expect(flag).toBeChecked();expect(fixture('read').raw).toBe(false);await click(admin,'SaveMarkdown');await expect(icon.locator('pre')).toHaveText('**Policy bold**');
  await admin.setViewportSize({width:390,height:844});if(await admin.locator(control('PageSidebar')).isVisible())await click(admin,'CloseSidebar');if(await admin.locator(control('LeftNavigation')).isVisible())await click(admin,'ToggleNavigation');await expect(admin.locator(control('SaveMarkdown'))).toBeVisible();expect((await admin.locator(control('MarkdownPanel')).boundingBox()).width).toBeLessThanOrEqual(390);
  const fi=JSON.parse(fs.readFileSync(path.join(source,'imports/i18n/data/fi.i18n.json'),'utf8'));await admin.evaluate(()=>webaI18n.setLanguage('fi'));await expect(admin.locator(control('AlwaysShowCodeAsText'))).toContainText(fi['always-show-code-as-text']);await admin.evaluate(()=>webaI18n.setLanguage('en'));
  const beforeDemote=fixture('read');fixture('demote');await expect(admin.locator(control('MarkdownPanel'))).toBeHidden();await expect(flag).not.toBeChecked();await forge(admin,'SaveMarkdown');await expect(admin.locator(control('Notice'))).toContainText('Administrator required');expect(fixture('read')).toEqual(beforeDemote);await expect(icon.locator('pre')).toHaveText('**Policy bold**');expect(errors).toEqual([]);
  console.log('Markdown policy browser: admin-only audited save/forged denial, live reader raw/rendered transitions and reload, clean-field refresh/dirty preservation, demotion clearing/refusal with no audit writes, Finnish/mobile controls passed');
 }finally{try{fixture('promote');fixture('save',false);fixture('cleanup',false,seeded.id);}finally{for(const c of contexts)await c.close();await browser.close();}}
})().catch(error=>{let message=error.stack||String(error);if(process.env.WEBA_TEST_PASSWORD)message=message.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(message);process.exitCode=1;});
