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
  const fixture=(mode,card=0)=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeTextFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_NATIVE_MODE:mode,WEBA_NATIVE_BOARD:String(seed.board),WEBA_NATIVE_CARD:String(card)}}));
  async function click(name){await settle();await page.locator(c(name)).click();await settle();}
  async function columns(){for(const item of seed.items){
   const column=page.locator('.weba-report .weba-column[data-list-id="'+item.list+'"]');
   await expect(column).toHaveCount(1);expect(await column.getAttribute('data-lane')).toBe(item.lane);expect(await column.getAttribute('data-list')).toBe(item.title);
   const card=column.locator('[data-card-id="'+item.card+'"]');await expect(card).toHaveCount(1);expect(await card.getAttribute('data-lane')).toBe(item.lane);expect(await card.getAttribute('data-status')).toBe(item.title);
  }await expect(page.locator('.weba-report tag')).toHaveCount(0);}
  await columns();
  await page.locator('.weba-report .weba-column[data-list-id="'+seed.items[1].list+'"] .weba-add-card-top').click();await settle();
  await expect(page.locator('[id$=".Lane:entry"]')).toHaveValue(seed.items[1].lane);
  await expect(page.locator('[id$=".Status:entry"]')).toHaveValue(seed.items[1].title);
  await page.locator('[id$=".CardTitle:entry"]').fill('Created in complete B');await click('SaveCard');
  await expect(page.locator(c('Notice'))).toHaveText('Card saved');await expect(page.locator('[id$=".Lane:entry"]')).toHaveValue(seed.items[1].lane);await expect(page.locator('[id$=".Status:entry"]')).toHaveValue(seed.items[1].title);
  const body="Draft\0Ω😀'<script>literal</script>";
  const description=page.locator('[id$=".Description:entry"],textarea[id$=".Description"]');
  await description.fill('Unsaved ordinary dirty edit');await page.evaluate(()=>webaRender());await expect(description).toHaveValue('Unsaved ordinary dirty edit');
  // A DOM input event explicitly exercises native wire bytes, including NUL.
  await description.evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},body);
  await page.evaluate(()=>webaRender());await expect(description).toHaveValue(body);
  await click('SaveCard');await expect(page.locator(c('Notice'))).toHaveText('Card saved');await expect(description).toHaveValue(body);
  await click('CloseEditor');await expect(page.locator('.weba-report .weba-column[data-list-id="'+seed.items[1].list+'"]')).toContainText('Created in complete B');
  const createdId=Number(await page.locator('.weba-report .weba-card-link').filter({hasText:'Created in complete B'}).getAttribute('data-card-id'));
  expect(fixture('read',createdId)).toMatchObject({description:body,lane:seed.items[1].lane,status:seed.items[1].title,list:seed.items[1].list});
  await click('ViewMenu');await click('Swimlanes');await columns();await expect(page.locator('.weba-report>.weba-swimlane')).toHaveCount(2);
  await page.reload();await columns();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>webaI18n.setLanguage('fi'));await columns();
  await click('ViewMenu');await click('TableView');for(const item of seed.items){const cells=await page.locator('.weba-report tr').filter({has:page.locator('[data-card-id="'+item.card+'"]')}).locator('td').allTextContents();expect(cells).toContain(item.lane);expect(cells).toContain(item.title);}
  for(const username of ['rest-native-reader','rest-native-assigned']){
   const readerContext=await browser.newContext();
   try{
    const reader=await readerContext.newPage();reader.on('pageerror',e=>errors.push(e.message));await reader.goto(process.env.WEBA_TEST_URL);
    await reader.locator('[id$=".WebTextName:entry"]').fill(username);await reader.locator('[id$=".WebTextPass:entry"]').fill(process.env.WEBA_TEST_PASSWORD);await reader.locator(c('WebButtonLogin')).click();await expect(reader.locator('.weba-content')).toBeVisible();await reader.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board);
    for(const item of seed.items){const column=reader.locator('.weba-report .weba-column[data-list-id="'+item.list+'"]');await expect(column).toHaveCount(1);expect(await column.getAttribute('data-lane')).toBe(item.lane);expect(await column.getAttribute('data-list')).toBe(item.title);}
    await expect(reader.locator('.weba-report [data-card-id="'+seed.items[0].card+'"]')).toHaveCount(1);
    await expect(reader.locator('.weba-report [data-card-id="'+seed.items[1].card+'"]')).toHaveCount(username==='rest-native-reader'?1:0);
    await expect(reader.locator('.weba-add-card-top,.weba-drag-handle')).toHaveCount(0);
   }finally{await readerContext.close();}
  }
  await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board+'/board/'+createdId);
  await expect(page.locator('[id$=".Lane:entry"]')).toHaveValue(seed.items[1].lane);await expect(page.locator('[id$=".Status:entry"]')).toHaveValue(seed.items[1].title);await expect(description).toHaveValue(body);
  await description.fill('Unsaved after revocation');fixture('revoke');const before=fixture('read',createdId);
  await page.evaluate(()=>gw.raise(document.querySelector('[id$=".SaveCard"]').id,'click',[],false));await settle();
  expect(fixture('read',createdId)).toEqual(before);
  expect(errors).toEqual([]);
  console.log('Native complete text browser: shared-prefix NUL/Unicode/markup lane/list identities retain exact columns/card placement across views/reload/Finnish/mobile; readonly/assigned scope, native create/edit/NUL dirty refresh/reload and late-revocation refusal passed');
 }finally{try{if(context)await context.close();}finally{if(browser)await browser.close();}}
})().catch(e=>{let s=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)s=s.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(s);process.exitCode=1;});
