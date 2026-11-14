'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'tests/playwright/fixtures.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 const {chromium,expect}=createRequire(path.join(source,'tests/playwright/fixtures.js'))('@playwright/test');
 let browser,context;
 try{
  const seed=JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}}));
  browser=await chromium.connectOverCDP(process.env.WEBA_BROWSER_URL);context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],c=n=>`[id$=".${n}"]`;
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.WEBA_TEST_URL);await page.locator('[id$=".WebTextName:entry"]').fill('rest-other');await page.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);await page.locator(c('WebButtonLogin')).click();
  await expect(page.locator('.weba-content')).toBeVisible();await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
  const settle=()=>page.waitForFunction(()=>window.gw&&gw.commands.length===0);
  const fixture=(mode,card=0,board=seed.board)=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_NATIVE_MODE:mode,WEBA_NATIVE_BOARD:String(board),WEBA_NATIVE_CARD:String(card)}}));
  async function click(name){await settle();const reply=page.waitForResponse(r=>new URL(r.url()).pathname==='/x'&&(new URLSearchParams(r.request().postData()||'').get('c')||'').includes(name));await page.locator(c(name)).click();await(await reply).finished();await settle();}
  await settle();
  for(const mode of ['outer','setters','queued-save','unheld']){
   const initial=fixture('read',seed.items[0].card);
   let armed=true,releaseOpen,openSeen;
   const released=new Promise(resolve=>releaseOpen=resolve),seen=new Promise(resolve=>openSeen=resolve);
   await page.route('**/x*',async route=>{
    const request=route.request(),raw=request.method()==='POST'?new URLSearchParams(request.postData()).get('c'):new URL(request.url()).searchParams.get('c');
    let command;try{command=JSON.parse(raw);}catch{}
    if(mode!=='unheld'&&armed&&command?.[0]==='raise'&&command[1]===null&&command[2]==='open'){
     armed=false;const response=await route.fetch();openSeen();await released;
     if(mode==='outer')await route.fulfill({response});
     else{
      // Execute the actual native deferred-setter API in the held initial response.
      const values=[['CardTitle',initial.title],['Description',initial.description]];
      const apply=function(values){for(const [name,text] of values){const input=document.querySelector(`[id$=".${name}:entry"],textarea[id$=".${name}"]`);if(input)gw[input.tagName==='TEXTAREA'?'textarea':'textbox'].setText(input.id.replace(/:entry$/,''),text);}};
      const instruction='\n;('+apply.toString()+')('+JSON.stringify(values)+');';
      await route.fulfill({response,body:(await response.text())+instruction});
     }
    }else await route.continue();
   });
   try{
    await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board+'/board/'+seed.items[0].card);
    if(mode!=='unheld'){let timer;try{await Promise.race([seen,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Native open was not intercepted')),15000))]);}finally{clearTimeout(timer);}}
    const description=page.locator('[id$=".Description:entry"],textarea[id$=".Description"]'),body="Early\0Ω😀'<tag> "+mode;
    await expect(description).toBeVisible();
    const title=page.locator('[id$=".CardTitle:entry"]'),draftTitle=" Early\0Ω title "+mode+" ";
    await page.evaluate(({title,body})=>{for(const [name,value] of [['CardTitle',title],['Description',body]]){const input=document.querySelector(`[id$=".${name}:entry"],textarea[id$=".${name}"]`);if(!input?.isConnected||input.disabled||input.readOnly)throw Error('Current editor field is not editable');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}},{title:draftTitle,body});
    await expect(description).toHaveValue(body);
    if(mode==='queued-save'||mode==='unheld')await page.locator(c('SaveCard')).evaluate(button=>button.click());
    releaseOpen();await page.waitForFunction(()=>window.webaNativeEditorStartup?.starting===false&&gw.commands.length===0);
    if(mode!=='queued-save'&&mode!=='unheld'){
     await expect(description).toHaveValue(body);await expect(title).toHaveValue(draftTitle);
     expect(fixture('read',seed.items[0].card)).toEqual(initial);await click('SaveCard');
    }
    await expect(page.locator(c('Notice'))).toHaveText('Card saved');await expect(title).toHaveValue(draftTitle.trim());
    expect(fixture('read',seed.items[0].card)).toMatchObject({title:draftTitle.trim(),description:body,lane:seed.items[0].lane,status:seed.items[0].title,list:seed.items[0].list});
   }finally{releaseOpen();await page.unroute('**/x*');}
  }
  expect(errors).toEqual([]);
  console.log('Startup editor: held open/actual deferred native setters/current-DOM unheld editing preserve latest full dirty text, queued early Save waits for initialization and saves exact values/placement');
 }finally{try{if(context)await context.close();}finally{if(browser)await browser.close();}}
})().catch(e=>{let s=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)s=s.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(s);process.exitCode=1;});
