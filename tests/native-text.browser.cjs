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
  async function moveCompleteCard(target){
   await settle();
   const source=page.locator('.weba-report .weba-card[data-card-id="'+seed.items[0].card+'"]');
   const destination=page.locator('.weba-report .weba-column[data-list-id="'+target.list+'"] .weba-list-body');
   await source.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();
   const from=await source.boundingBox(),to=await destination.boundingBox();
   await page.mouse.move(from.x+12,from.y+12);await page.mouse.down();
   await page.mouse.move(to.x+to.width/2,to.y+to.height-8,{steps:12});await page.mouse.up();await settle();
   await expect.poll(()=>fixture('read',seed.items[0].card)).toMatchObject({lane:target.lane,status:target.title,list:target.list});
   await expect(destination.locator('[data-card-id="'+seed.items[0].card+'"]')).toHaveCount(1);
   // The native gesture intentionally suppresses the trailing click.
   await page.waitForFunction(()=>!webaDrag.clickSuppressed);
  }
  await moveCompleteCard(seed.items[1]);await page.reload();
  expect(fixture('read',seed.items[0].card)).toMatchObject({lane:seed.items[1].lane,status:seed.items[1].title,list:seed.items[1].list});
  await moveCompleteCard(seed.items[0]);await columns();
  await page.locator('.weba-report .weba-card-link[data-card-id="'+seed.items[0].card+'"]').click();await settle();
  // Native Move must initialize its current complete lane and list choices.
  await page.locator('.weba-report .weba-card[data-card-id="'+seed.items[0].card+'"] .weba-card-menu').click();await settle();await click('ContextMove');
  const destinationLane=page.locator('[id$=".DestinationLane:select"]'),destinationList=page.locator('[id$=".DestinationList:select"]');
  await expect(destinationLane.locator('option')).toHaveCount(2);
  await expect(destinationList.locator('option')).toHaveCount(3);
  expect(await destinationLane.evaluate(select=>select.selectedIndex)).toBe(0);
  await destinationLane.selectOption({index:1});await settle();
  await expect(destinationList.locator('option').first()).toContainText(String(seed.items[1].list)+' | ');
  await click('ActionConfirm');
  expect(fixture('read',seed.items[0].card)).toMatchObject({lane:seed.items[1].lane,status:seed.items[1].title,list:seed.items[1].list});
  await expect(page.locator('[id$=".Lane:entry"]')).toHaveValue(seed.items[1].lane);await expect(page.locator('[id$=".Status:entry"]')).toHaveValue(seed.items[1].title);
  await page.locator('.weba-report .weba-card[data-card-id="'+seed.items[0].card+'"] .weba-card-menu').click();await settle();await click('ContextMove');
  expect(await destinationLane.evaluate(select=>select.selectedIndex)).toBe(1);
  await destinationLane.selectOption({index:0});await settle();await click('ActionConfirm');
  expect(fixture('read',seed.items[0].card)).toMatchObject({lane:seed.items[0].lane,status:seed.items[0].title,list:seed.items[0].list});
  await columns();await click('CloseEditor');
  async function containerGesture(source,destination){
   await settle();await source.scrollIntoViewIfNeeded();await destination.scrollIntoViewIfNeeded();
   const from=await source.boundingBox(),to=await destination.boundingBox();
   await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
   await page.mouse.move(to.x+8,to.y+8,{steps:12});await page.mouse.up();await settle();
   await page.waitForFunction(()=>!webaDrag.clickSuppressed);
  }
  const movedList=()=>page.locator('.weba-report .weba-column[data-list-id="'+seed.items[0].list+'"]');
  await containerGesture(movedList().locator('.weba-list-header h4'),page.locator('.weba-report .weba-column[data-list-id="'+seed.items[1].list+'"]'));
  await expect.poll(()=>fixture('read',seed.items[0].card)).toMatchObject({lane:seed.items[1].lane,status:seed.items[0].title,list:seed.items[0].list});
  await page.reload();expect(await movedList().getAttribute('data-lane')).toBe(seed.items[1].lane);
  await containerGesture(movedList().locator('.weba-list-header h4'),page.locator('.weba-report .weba-column[data-list="Doing"]').first());
  await expect.poll(()=>fixture('read',seed.items[0].card)).toMatchObject({lane:seed.items[0].lane,status:seed.items[0].title,list:seed.items[0].list});
  await columns();
  const lanes=page.locator('.weba-report>.weba-swimlane');
  await containerGesture(lanes.nth(1).locator('.weba-swimlane-header h3'),lanes.first().locator('.weba-swimlane-header'));
  await expect.poll(()=>lanes.evaluateAll(nodes=>nodes.map(node=>node.dataset.lane))).toEqual([seed.items[1].lane,seed.items[0].lane]);
  await page.reload();expect(await lanes.evaluateAll(nodes=>nodes.map(node=>node.dataset.lane))).toEqual([seed.items[1].lane,seed.items[0].lane]);
  await containerGesture(lanes.nth(1).locator('.weba-swimlane-header h3'),lanes.first().locator('.weba-swimlane-header'));
  await expect.poll(()=>lanes.evaluateAll(nodes=>nodes.map(node=>node.dataset.lane))).toEqual([seed.items[0].lane,seed.items[1].lane]);
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
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>webaI18n.setLanguage('en'));
  await click('ViewMenu');await click('Swimlanes');
  const newLane="Created lane\0Ω😀'<literal>",newList="Created list\0Ω😀'new";
  await page.locator('.weba-report .weba-add-lane').first().click();await settle();
  await page.locator('[id$=".ActionText:entry"]').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},newLane);
  await click('ActionConfirm');
  await expect.poll(()=>fixture('containers').lanes.map(row=>row.title)).toContain(newLane);
  const newLaneRow=page.locator('.weba-report>.weba-swimlane').filter({has:page.locator('h3').filter({hasText:"Created lane"})});
  await expect(newLaneRow).toHaveCount(1);expect(await newLaneRow.getAttribute('data-lane')).toBe(newLane);
  expect(await newLaneRow.locator('h3').textContent()).toBe(newLane);await expect(newLaneRow.locator('literal')).toHaveCount(0);
  await newLaneRow.locator('.weba-add-list').first().click();await settle();
  await page.locator('[id$=".ActionText:entry"]').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},newList);
  await click('ActionConfirm');
  await expect.poll(()=>fixture('containers').lists.filter(row=>row.lane===newLane).map(row=>row.title)).toContain(newList);
  await page.reload();expect(await newLaneRow.getAttribute('data-lane')).toBe(newLane);
  await expect(newLaneRow.locator('.weba-column')).toHaveCount(4);
  const newListId=fixture('containers').lists.find(row=>row.lane===newLane&&row.title===newList).id;
  const actionText=page.locator('[id$=".ActionText:entry"]');
  async function actionValue(value){await actionText.evaluate((input,text)=>{input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));},value);}
  const renamedLane="Renamed lane\0Ω😀'<literal>",renamedList="Renamed list\0Ω😀'new";
  await newLaneRow.locator('.weba-lane-menu').click();await settle();await click('ContextRename');
  await expect(actionText).toHaveValue(newLane);await actionText.fill('Dirty ordinary rename');await page.evaluate(()=>webaRender());await expect(actionText).toHaveValue('Dirty ordinary rename');
  await actionValue(renamedLane);await click('ActionConfirm');
  await expect.poll(()=>fixture('containers').lanes.map(row=>row.title)).toContain(renamedLane);
  const renamedLaneRow=page.locator('.weba-report>.weba-swimlane').filter({has:page.locator('h3').filter({hasText:"Renamed lane"})});
  expect(await renamedLaneRow.getAttribute('data-lane')).toBe(renamedLane);expect(await renamedLaneRow.locator('h3').textContent()).toBe(renamedLane);
  await page.locator('.weba-report .weba-column[data-list-id="'+newListId+'"] .weba-list-menu').click();await settle();await click('ContextRename');
  await expect(actionText).toHaveValue(newList);await actionValue(renamedList);await click('ActionConfirm');
  expect(fixture('containers').lists.find(row=>row.id===newListId)).toMatchObject({lane:renamedLane,title:renamedList});
  await page.goto(process.env.WEBA_TEST_URL+'/allboards/remaining');
  const boardMenu=page.locator('.weba-board-tile-group[data-board-id="'+seed.board+'"] .weba-board-context');
  await boardMenu.click();await settle();await click('ContextRename');
  const renamedBoard="Renamed board\0Ω😀'<literal>";
  await actionValue(renamedBoard);await click('ActionConfirm');expect(fixture('containers').boardTitle).toBe(renamedBoard);
  await boardMenu.click();await settle();await click('ContextRename');await expect(actionText).toHaveValue(renamedBoard);
  await actionText.fill('Unsaved board rename');await page.evaluate(()=>webaRender());await expect(actionText).toHaveValue('Unsaved board rename');await click('CloseAction');
  expect(fixture('containers').boardTitle).toBe(renamedBoard);
  await page.goto(process.env.WEBA_TEST_URL+'/b/'+seed.board+'/board/'+createdId);
  await expect(page.locator('[id$=".Lane:entry"]')).toHaveValue(seed.items[1].lane);await expect(page.locator('[id$=".Status:entry"]')).toHaveValue(seed.items[1].title);await expect(description).toHaveValue(body);
  await page.locator('.weba-report .weba-card[data-card-id="'+createdId+'"] .weba-card-menu').click();await settle();await click('ContextRename');
  const renamedCard="Renamed card\0Ω😀'new";await actionValue(renamedCard);await click('ActionConfirm');
  expect(fixture('read',createdId).title).toBe(renamedCard);await expect(page.locator('[id$=".CardTitle:entry"]')).toHaveValue(renamedCard);
  await description.fill('Unsaved after revocation');
  await page.locator('.weba-report .weba-card[data-card-id="'+createdId+'"] .weba-card-menu').click();await settle();await click('ContextRename');await expect(actionText).toHaveValue(renamedCard);await actionValue("Refused\0rename");
  fixture('revoke');const before=fixture('read',createdId);
  await page.evaluate(()=>gw.raise(document.querySelector('[id$=".ActionConfirm"]').id,'click',[],false));await settle();expect(fixture('read',createdId)).toEqual(before);
  await page.evaluate(()=>gw.raise(document.querySelector('[id$=".SaveCard"]').id,'click',[],false));await settle();
  expect(fixture('read',createdId)).toEqual(before);
  expect(errors).toEqual([]);
  console.log('Native complete text browser: shared-prefix NUL/Unicode/markup lane/list identities retain exact columns/card placement across views/reload/Finnish/mobile; readonly/assigned scope, native exact card/list/lane mouse and card dialog moves with editor refresh/reload, exact lane/list creation and board/card/list/lane native renames with SQL/dirty/reload checks, create/edit/NUL dirty refresh/reload and late-revocation refusal passed');
 }finally{try{if(context)await context.close();}finally{if(browser)await browser.close();}}
})().catch(e=>{let s=e.stack||String(e);if(process.env.WEBA_TEST_PASSWORD)s=s.split(process.env.WEBA_TEST_PASSWORD).join('[redacted]');console.error(s);process.exitCode=1;});
