// Five original spec39 catalog callbacks unchanged; explicit native adapters.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original spec39 unavailable');
 const spec=path.join(source,'tests/playwright/specs/39-allboards-sort-search-pagination.e2e.js'),{chromium,expect,request}=createRequire(spec)('@playwright/test');
 const api=await request.newContext({baseURL:process.env.WEBA_TEST_URL});let browser,context;const accounts=[];
 const fixture=(mode,user,extra={})=>JSON.parse(execFileSync(process.env.GBX,['-s','OriginalCatalogFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_TEST_USER:user,WEBA_ORIGINAL_CATALOG_MODE:mode,...extra}}));
 const owners=new Map(),db={findOne:(collection,query)=>{if(collection!=='users'||Object.keys(query).join(',')!=='_id')throw Error('Unsupported profile fixture query');return{profile:{allBoardsSortBy:fixture('profile',query._id).sortBy}};},seedBoard:({ownerId,title})=>{const board=fixture('seed',ownerId,{WEBA_ORIGINAL_CATALOG_TITLE:title});owners.set(board.boardId,ownerId);return board;},cleanup:({boardIds})=>{for(const id of boardIds){const owner=owners.get(id);if(!owner)throw Error('Unknown fixture board');fixture('cleanup',owner,{WEBA_ORIGINAL_CATALOG_IDS:JSON.stringify([id])});owners.delete(id);}}};
 const cases=[],stack=[];
 const test=(title,callback)=>cases.push({title,callback,hooks:stack.flatMap(scope=>scope.before),cleanup:stack.toReversed().flatMap(scope=>scope.after)});
 test.describe=(_title,callback)=>{stack.push({before:[],after:[]});callback();stack.pop();};test.beforeEach=callback=>stack.at(-1).before.push(callback);test.afterEach=callback=>stack.at(-1).after.push(callback);
 const login=async username=>{const response=await api.post('/users/login',{data:{username,password:process.env.WEBA_TEST_PASSWORD}});expect(response.status()).toBe(200);const user=await response.json();secrets.push(user.token);return user;};
 const waitForMeteor=target=>target.waitForFunction(()=>window.gw&&window.webaI18n&&window.Meteor);
 let principal,pageCalls=0;
 const loginWithToken=async(target,id,token)=>{
  const response=await api.get('/api/users/'+encodeURIComponent(id)+'/boards',{headers:{Authorization:'Bearer '+token}});expect(response.status()).toBe(200);
  principal={id,token};await target.goto(process.env.WEBA_TEST_URL);await waitForMeteor(target);
  await target.locator('[id$=".WebTextName:entry"]').fill(id);await target.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);
  await target.locator('[id$=".WebButtonLogin"]').click();await expect(target.locator('.workspaces-header')).toBeVisible();
 };
 try{
  vm.runInNewContext(fs.readFileSync(spec,'utf8'),{process:{env:{WEKAN_BASE_URL:process.env.WEBA_TEST_URL.replace(/\/$/,'')}},require:name=>{if(name==='../fixtures')return{test,expect};if(name==='../helpers/db')return db;if(name==='../helpers/auth')return{loginWithToken,waitForMeteor};throw Error('Unsupported original dependency '+name);}},{filename:spec});
  const selected=cases.filter(item=>item.title==='Title A→Z and Z→A sort the board grid; custom hides pagination'||item.title==='search filters boards by name; non-matching search shows none'||item.title==='returns the correct sorted page and total; pages do not overlap'||item.title==='search narrows the total; a non-matching search returns nothing'||item.title==='does not leak boards the user has no access to (negative)');expect(selected).toHaveLength(5);expect(cases).toHaveLength(6);
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);
  for(const item of selected){
   const freshUser=async()=>{const id='catalog-'+randomUUID();fixture('create-user',id);accounts.push(id);return login(id);};
   const user=await freshUser(),user2=await freshUser();
   context=await browser.newContext();principal=null;
   await context.exposeBinding('nativeCatalogPage',async({frame},params)=>{
    if(!principal||new URL(frame.url()).origin!==new URL(process.env.WEBA_TEST_URL).origin)throw Error('Authenticated fixture required');
    const response=await api.get('/api/users/'+encodeURIComponent(principal.id)+'/boards',{headers:{Authorization:'Bearer '+principal.token}});if(response.status()!==200)throw Error('API credential rejected');
    // Explicit authenticated-token -> native session identity adapter; no caller-supplied user option.
    pageCalls++;return fixture('page',principal.id,{WEBA_ORIGINAL_CATALOG_PARAMS:JSON.stringify(params)});
   });
   await context.addInitScript(()=>{window.Meteor={call(name,...args){const callback=args.pop();if(name!=='getAllBoardsPage')throw Error('Unsupported original method');window.nativeCatalogPage(args[0]).then(result=>callback(null,result),error=>callback(error));}};});
   const page=await context.newPage(),args={page,user,user2};
   try{for(const hook of item.hooks)await hook(args);await item.callback(args);
    if(item.title==='does not leak boards the user has no access to (negative)'){
     const before=pageCalls,response=await api.post('/users/logout',{headers:{Authorization:'Bearer '+user.token},data:{}});expect(response.status()).toBe(200);
     await expect(page.locator('.workspaces-header')).toBeVisible();
     expect(await page.evaluate(()=>window.nativeCatalogPage({search:'Secret User2 Board'}).then(()=>false,()=>true))).toBe(true);expect(pageCalls).toBe(before);
     console.log('Original catalog adapter security: revoked API token refused before native service invocation despite retained native UI session');
    }
    console.log('Original spec39 catalog callback passed: '+item.title);}finally{for(const hook of item.cleanup)await hook(args);await context.close();context=null;for(const id of [user.id,user2.id]){fixture('delete-user',id);accounts.splice(accounts.indexOf(id),1);}}
  }
  expect(owners.size).toBe(0);
  console.log('Original spec39 catalog: 3 server + 2 sort/search UI unchanged callbacks/hooks passed through real native BoardCatalog.Page; explicit test-only RPC, numeric-ID, fixture DB/profile and API-token-to-native-session adapters. No production DDP/routing claim; Latin is covered separately; all six callbacks have explicit adapter-backed execution, production transport remains open.');
 }finally{for(const id of accounts)fixture('delete-user',id);if(context)await context.close();if(browser)await browser.close();await api.dispose();}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
