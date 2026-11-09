// Original spec 39 Latin callback, unchanged, with explicit native auth/locale adapters.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original WeKan spec unavailable');
 const spec=path.join(source,'tests/playwright/specs/39-allboards-sort-search-pagination.e2e.js');
 const {chromium,expect,request}=createRequire(spec)('@playwright/test');
 const cases=[],test=(title,callback)=>cases.push({title,callback});
 test.describe=(_title,callback)=>callback();test.beforeEach=()=>{};test.afterEach=()=>{};
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL});
 let browser,context;
 try{
  const response=await api.post('/users/login',{data:{username:'rest-member',password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);
  const user=await response.json();secrets.push(user.token);
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext();
  // Locale callback adapter only: this does not implement Meteor/DDP or persist profile language.
  await context.addInitScript(()=>{window.Meteor={call(name,...args){const callback=args.pop();if(name!=='setLanguage')throw Error('Unsupported original method');Promise.resolve(window.webaI18n.setLanguage(args[0])).then(()=>callback(null,null),callback);}};});
  const page=await context.newPage();
  const waitForMeteor=target=>target.waitForFunction(()=>window.webaI18n&&window.gw);
  const loginWithToken=async(target,id,token)=>{
   expect(id).toBe(user.id);expect(token).toBe(user.token);
   // API token is validated by the actual login response; native UI requires its own password session.
   await target.goto(process.env.WEBA_TEST_URL);await waitForMeteor(target);
   await target.locator('[id$=".WebTextName:entry"]').fill('rest-member');
   await target.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);
   await target.locator('[id$=".WebButtonLogin"]').click();await expect(target.locator('.workspaces-header')).toBeVisible();
  };
  vm.runInNewContext(fs.readFileSync(spec,'utf8'),{process:{env:{WEKAN_BASE_URL:process.env.WEBA_TEST_URL.replace(/\/$/,'')}},require:name=>{
   if(name==='../fixtures')return{test,expect};if(name==='../helpers/db')return{};if(name==='../helpers/auth')return{loginWithToken,waitForMeteor};throw Error('Unsupported source dependency '+name);
  }},{filename:spec});
  const selected=cases.filter(item=>item.title==='Latin workspace navigation and creation form use translated labels');expect(selected).toHaveLength(1);expect(cases).toHaveLength(6);
  await selected[0].callback({page,user});
  console.log('Original spec 39: unchanged Latin workspace callback passed (1/6); this runner executes Latin only; five catalog callbacks run separately. Explicit native password-session and client locale adapters; no DDP/profile persistence claim.');
 }finally{if(context)await context.close();if(browser)await browser.close();await api.dispose();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
