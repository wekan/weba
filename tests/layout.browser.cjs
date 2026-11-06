// Run only against an isolated empty instance (tests/run-http.py --browser).
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const path = require('node:path');
(async () => {
  const browser = await puppeteer.connect({browserURL:process.env.WEBA_BROWSER_URL});
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const selector = name => `[id$=".${name}"]`;
  const entry = name => `[id$=".${name}:entry"]`;
  const settle = () => page.waitForFunction(() => window.gw && gw.commands.length === 0);
  const click = async name => {await settle(); await page.locator(selector(name)).click(); await settle();};
  const visible = async name => page.waitForSelector(selector(name),{visible:true});
  const fill = async (name,value) => {await settle(); await page.locator(entry(name)).fill(value);};
  const shot = async name => {if(process.env.WEBA_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.WEBA_SCREENSHOT_DIR,name+'.png')});};
  page.on('pageerror', error => {throw error;});
  try {
    await page.setViewport({width:1440,height:1000});
    await page.goto(process.env.WEBA_TEST_URL,{waitUntil:'networkidle2'});
    await page.waitForFunction(() => window.webaI18n && document.querySelector('[data-weba-language]')?.options.length > 200);
    await page.evaluate(() => webaI18n.setLanguage('fi'));
    assert.equal(await page.$eval(selector('WebLabelUser'),e=>e.textContent),'Käyttäjätunnus');
    await page.reload({waitUntil:'networkidle2'});
    await page.waitForFunction(() => document.documentElement.lang === 'fi');
    await page.evaluate(() => webaI18n.setLanguage('ar'));
    assert.equal(await page.$eval('html',e=>e.dir),'rtl');
    await page.evaluate(() => webaI18n.setLanguage('en'));
    await click('ShowRegistration');
    await page.evaluate(() => document.fonts.ready);
    for (const button of ['ShowPassword','ShowConfirmPassword']) {
      const icon = await page.$eval(selector(button), e => ({text:e.textContent.trim(),icon:getComputedStyle(e,'::before').content}));
      assert.equal(icon.text,'','visibility toggle has no visible text');
      assert.ok(icon.icon.includes('\uf06e'),'hidden password uses the Font Awesome eye');
    }
    const passwords = await page.evaluate(() => {
      const box = name => document.querySelector(`[id$=".${name}"]`).getBoundingClientRect();
      return [['WebTextPass','ShowPassword'],['ConfirmPassword','ShowConfirmPassword']].map(([field,button]) => {
        const input=document.querySelector(`[id$=".${field}:entry"]`);
        const a=box(field),b=box(button);
        return {right:a.right,buttonLeft:b.left,top:a.top,buttonTop:b.top,background:getComputedStyle(input).backgroundColor};
      });
    });
    for (const row of passwords) {
      assert.ok(row.buttonLeft >= row.right-1,'visibility button follows its password input');
      assert.ok(Math.abs(row.top-row.buttonTop)<2,'visibility button shares the input row');
      assert.equal(row.background,'rgb(255, 255, 255)','password input has a white background');
    }
    await click('ShowPassword');
    assert.equal(await page.$eval(entry('WebTextPass'),e=>e.type),'text');
    assert.equal(await page.$eval(entry('ConfirmPassword'),e=>e.type),'password');
    await click('ShowConfirmPassword');
    assert.equal(await page.$eval(entry('ConfirmPassword'),e=>e.type),'text');
    await click('ShowPassword'); await click('ShowConfirmPassword');
    if(process.env.WEBA_LOGIN_LAYOUT_ONLY) {
      console.log('Login/register layout: white inputs, right-side independent visibility buttons passed');
      return;
    }
    await fill('WebTextName','layout-'+Date.now());
    await fill('WebTextPass','layout-comparison-password');
    await fill('ConfirmPassword','layout-comparison-password');
    await click('Register');
    await visible('Header');
    await page.waitForFunction(() => document.querySelector('.weba-content'));
    await page.evaluate(() => webaI18n.setLanguage('fi'));
    assert.equal(await page.$eval(selector('Remaining'),e=>e.textContent.trim()),'Jäljellä');
    await click('AccountToggle');
    await page.waitForSelector('[data-weba-language]',{visible:true});
    await page.select('[data-weba-language]','en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await click('AccountToggle');
    if(process.env.WEBA_I18N_ONLY) {
      console.log('Browser translations: Finnish login, persisted selection, Arabic RTL and signed-in language picker passed');
      return;
    }
    await page.evaluate(()=>document.fonts.ready);
    const nativeIcon=await page.$eval(selector('Home'),e=>({className:e.className,text:e.textContent,content:getComputedStyle(e,'::before').content,font:getComputedStyle(e).fontFamily}));
    assert.ok(nativeIcon.className.includes('fa-home'));
    assert.equal(nativeIcon.text,'');assert.ok(nativeIcon.font.includes('Font Awesome 6 Free'));
    assert.ok(nativeIcon.content && nativeIcon.content!=='none');
    if(process.env.WEBA_ICONS_ONLY){console.log('Browser native Font Awesome header icons passed');return;}
    await shot('weba-overview');
    const geometry = await page.evaluate(() => {
      const box = name => {const r=document.querySelector(`[id$=".${name}"]`).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {header:['Home','ToggleNavigation','PageTitle','Brand','ViewMenu','AccountToggle','SidebarToggle'].map(box),nav:box('LeftNavigation'),content:box('Workspace'),body:box('Body'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    for(let i=1;i<geometry.header.length;i++)assert.ok(geometry.header[i].left>=geometry.header[i-1].right-1,'header control order');
    assert.ok(geometry.nav.right<=geometry.content.left+1,'navigation precedes main content');
    assert.ok(geometry.body.top>=geometry.header[0].bottom,'content is below one header');
    assert.equal(geometry.overflow,false,'desktop must not overflow');
    await click('AddBoardTile');
    await visible('PageSidebar');
    await fill('BoardTitle','Layout board');
    await click('NewBoard');
    await page.waitForSelector('.weba-board-tile');
    await click('CloseSidebar');
    await page.click('.weba-board-tile');
    await page.waitForFunction(()=>document.querySelector('[id$=".PageTitle"]').textContent.replace(/\u00a0/g,' ')==='Layout board');
    await page.waitForFunction(()=>document.querySelector('.weba-content')?.dataset.view==='Swimlanes');
    assert.equal(await page.$$eval('[id$=".Boards"] img',els=>els.filter(e=>e.getBoundingClientRect().width>0).length),0,'tree uses Font Awesome instead of visible bitmap icons');
    assert.equal(await page.$$eval('.weba-add-list .fa-plus-square-o',els=>els.length),3,'list-add uses the same regular Font Awesome icon as WeKan');
    assert.equal(await page.$$eval('.weba-column',els=>els.length),3,'empty board shows its initial lists');
    if(process.env.WEBA_DRAG_ONLY) {
      await page.setViewport({width:1000,height:850,hasTouch:true});
      await click('Home');
      await page.waitForSelector('.weba-board-tile');await page.click('.weba-board-tile');await settle();
      const column=(lane,list)=>`.weba-column[data-lane="${lane}"][data-list="${list}"]`;
      async function addCard(title){await page.click('.weba-add-card-top');await settle();await visible('Editor');await fill('CardTitle',title);await click('SaveCard');await click('CloseEditor');await settle();}
      await addCard('Drag one');await addCard('Drag two');
      await page.click('.weba-add-lane');await page.locator('.weba-structure-composer input').fill('Second ä');await page.click('.weba-structure-composer button:not(.weba-popup-close)');await settle();
      await page.click('.weba-add-list');await page.locator('.weba-structure-composer input').fill('Review');await page.click('.weba-structure-composer button:not(.weba-popup-close)');await settle();
      const ids=await page.$$eval('.weba-data .weba-card',els=>Object.fromEntries(els.map(e=>[e.querySelector('strong').textContent,e.dataset.cardId])));
      const card=id=>`.weba-report .weba-card[data-card-id="${id}"]`;
      const location=id=>page.$eval(`.weba-data .weba-card[data-card-id="${id}"]`,e=>[e.dataset.lane,e.dataset.status]);
      const point=async(selector,edge=false)=>page.$eval(selector,(e,edge)=>{const r=e.getBoundingClientRect();return {x:r.left+(edge?8:r.width/2),y:r.top+(edge?8:r.height/2)};},edge);
      const session=await page.createCDPSession();
      async function touch(type,p){await session.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:1,radiusX:2,radiusY:2,force:1}]:[]});}
      async function gesture(from,to,end='touchEnd'){
        await touch('touchStart',from);
        for(let i=1;i<=10;i++){await touch('touchMove',{x:from.x+(to.x-from.x)*i/10,y:from.y+(to.y-from.y)*i/10});await page.evaluate(()=>new Promise(requestAnimationFrame));}
        await touch(end,null);await settle();
      }
      await page.touchscreen.tap(...Object.values(await point(card(ids['Drag one']))));await settle();await visible('Editor');await click('CloseEditor');
      // Reorder cards by real touch events, not synthetic PointerEvent dispatch.
      await gesture(await point(card(ids['Drag two'])+' .weba-drag-handle'),await point(card(ids['Drag one']),true));
      await page.waitForFunction((id)=>document.querySelector('.weba-report .weba-list-body .weba-card')?.dataset.cardId===id,{},ids['Drag two']);
      assert.equal(await page.$eval(selector('Editor'),e=>getComputedStyle(e).display),'none','drag does not open card details');
      await gesture(await point(card(ids['Drag one'])+' .weba-drag-handle'),await point(column('Default','Review')+' .weba-list-body'));
      await page.waitForFunction(id=>document.querySelector(`.weba-data .weba-card[data-card-id="${id}"]`)?.dataset.status==='Review',{},ids['Drag one']);
      page.once('dialog',dialog=>dialog.accept());
      await gesture(await point(column('Default','Review')+' [data-drag-kind="list"]'),await point(column('Second ä','Doing'),true));
      await page.waitForSelector(column('Second ä','Review'));
      assert.deepEqual(await location(ids['Drag one']),['Second ä','Review'],'list drag carries its cards');
      page.once('dialog',dialog=>dialog.dismiss());
      await gesture(await point(column('Second ä','Review')+' [data-drag-kind="list"]'),await point(column('Default','Doing'),true));
      assert.equal(await page.$(column('Default','Review')),null,'declining list move leaves its source intact');
      assert.deepEqual(await location(ids['Drag one']),['Second ä','Review']);
      await gesture(await point(card(ids['Drag one'])+' .weba-drag-handle'),await point(column('Second ä','Todo')+' .weba-list-body'));
      await page.waitForFunction(id=>document.querySelector(`.weba-data .weba-card[data-card-id="${id}"]`)?.dataset.status==='Todo',{},ids['Drag one']);
      const laneHandle=await page.$eval('.weba-swimlane:nth-child(2) [data-drag-kind="lane"]',e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await gesture(laneHandle,await point('.weba-swimlane:first-child .weba-swimlane-header',true));
      await page.waitForFunction(()=>document.querySelector('.weba-swimlane')?.dataset.lane==='Second ä');
      // Mouse dragging the card surface remains supported on touch-capable devices.
      const from=await point(card(ids['Drag two'])),to=await point(column('Default','Doing')+' .weba-list-body');
      await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();await settle();
      await page.waitForFunction(id=>document.querySelector(`.weba-data .weba-card[data-card-id="${id}"]`)?.dataset.status==='Doing',{},ids['Drag two']);
      const viewport=await page.$eval(column('Default','Doing')+' .weba-list-body',e=>{const r=e.closest('.weba-columns').getBoundingClientRect(),b=e.getBoundingClientRect();return {x:r.right-5,y:b.top+20};});
      await touch('touchStart',await point(card(ids['Drag two'])+' .weba-drag-handle'));await touch('touchMove',viewport);
      await page.waitForFunction(()=>[...document.querySelectorAll('.weba-columns')].some(e=>e.closest('.weba-swimlane').dataset.lane==='Default'&&e.scrollLeft>0));
      await touch('touchCancel',null);assert.equal(await page.$('.weba-drag-ghost'),null);
      assert.deepEqual(await location(ids['Drag two']),['Default','Doing'],'cancel leaves data unchanged');
      const scroll=await page.$eval('.weba-swimlane:first-child .weba-columns',e=>{e.scrollLeft=0;const r=e.getBoundingClientRect();return {x:r.right-30,y:r.bottom-5};});
      await gesture(scroll,{x:scroll.x-300,y:scroll.y});
      await page.waitForFunction(()=>document.querySelector('.weba-swimlane:first-child .weba-columns').scrollLeft>0);
      assert.equal(await page.evaluate(()=>webaDrag.active),false,'ordinary swipe scrolls without starting a drag');
      await new Promise(resolve=>setTimeout(resolve,750));
      await click('Home');await page.click('.weba-board-tile');await settle();
      await page.waitForFunction(()=>document.querySelector('.weba-swimlane')?.dataset.lane==='Second ä');
      assert.deepEqual(await location(ids['Drag two']),['Default','Doing']);assert.deepEqual(await location(ids['Drag one']),['Second ä','Todo']);
      await shot('weba-touch-drag');
      console.log('Browser touch drag: card reorder/list and lane moves, carried cards, persistence, mouse surface, auto-scroll, touch scrolling and cancel passed');
      return;
    }
    if(process.env.WEBA_POPUPS_ONLY) {
      async function contained(selector) {
        await page.waitForFunction(selector=>{
          const e=document.querySelector(selector);if(!e)return false;
          const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=7&&r.top>=7&&r.right<=innerWidth-7&&r.bottom<=innerHeight-7;
        },{},selector);
        const close=await page.$eval(selector,e=>{
          const x=e.querySelector('.weba-popup-close'),a=e.getBoundingClientRect(),b=x.getBoundingClientRect();
          return {right:a.right-b.right,top:b.top-a.top,visible:b.width>0&&b.height>0,clickable:x.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))};
        });
        assert.ok(close.visible&&close.clickable,'X is visible and reachable');
        assert.ok(close.right<30&&close.top<32,'X is at the top right');
      }
      await page.click('.weba-add-card-top');await settle();await visible('Editor');
      await contained('[id$=".Editor"]');
      await page.waitForFunction(()=>{
        const a=document.querySelector('[id$=".CardTitle"]').getBoundingClientRect(),b=document.getElementById('gw-focus').getBoundingClientRect();
        return Math.abs(a.left-b.left)<2&&Math.abs(a.top-b.top)<2;
      });
      await shot('weba-anchored-card-popup');
      const distance=await page.evaluate(()=>{const a=document.querySelector('.weba-add-card-top').getBoundingClientRect(),b=document.querySelector('[id$=".Editor"]').getBoundingClientRect();return Math.abs(b.top-a.bottom);});
      assert.ok(distance<12,'card popup opens beside the add button when space permits');
      await click('CloseEditor');
      await page.waitForFunction(()=>document.activeElement?.matches('.weba-add-card-top')&&document.getElementById('gw-focus').style.display==='none');
      await click('ViewMenu');await visible('Views');await contained('[id$=".Views"]');await click('CloseViews');
      await click('AccountToggle');await visible('AccountMenu');await contained('[id$=".AccountMenu"]');await click('CloseAccount');
      await page.click('.weba-list-menu');await contained('.weba-structure-menu');await page.click('.weba-structure-menu .weba-popup-close');
      assert.equal(await page.$('.weba-structure-menu'),null);
      await page.click('.weba-add-list');
      const inlineClose=await page.$eval('.weba-structure-composer',e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.weba-popup-close').getBoundingClientRect();return a.right-b.right<15&&b.top-a.top<15;});
      assert.ok(inlineClose,'list composer X is at top right');await page.click('.weba-structure-composer .weba-popup-close');
      for(const viewport of [{width:390,height:844},{width:844,height:390}]){
        await page.setViewport(viewport);
        await page.click('.weba-add-card-bottom');await settle();await visible('Editor');await contained('[id$=".Editor"]');
        await page.$eval('[id$=".Editor"]',e=>{e.scrollTop=e.scrollHeight;});
        await contained('[id$=".Editor"]');
        await page.keyboard.press('Escape');await settle();
        await page.waitForSelector('[id$=".Editor"]',{hidden:true});
      }
      console.log('Browser popups: anchored add-card, viewport containment, top-right X, menus/composers and portrait/landscape Escape checks passed');
      return;
    }
    if(process.env.WEBA_SWIMLANES_ONLY) {
      const positions=await page.evaluate(()=>{
        const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
        return {lane:box('.weba-swimlane-header h3'),laneControls:box('.weba-swimlane-controls'),caret:box('.weba-collapse-list'),top:box('.weba-add-card-top'),menu:box('.weba-list-menu'),list:box('.weba-add-list'),bottom:box('.weba-add-card-bottom')};
      });
      assert.ok(positions.lane.right<positions.laneControls.left,'swimlane controls at the end of the header');
      assert.ok(positions.caret.right<positions.top.left,'list caret at the start');
      assert.ok(positions.top.right<=positions.menu.left && positions.menu.right<=positions.list.left,'card/menu/list buttons in WeKan order');
      assert.ok(positions.bottom.top>positions.top.bottom,'second card button is below the cards');
      await page.click('.weba-add-lane');
      await page.locator('.weba-structure-composer input').fill('Tyhjä rata');
      await page.click('.weba-structure-composer button:not(.weba-popup-close)'); await settle();
      await page.waitForFunction(()=>[...document.querySelectorAll('.weba-swimlane h3')].some(e=>e.textContent==='Tyhjä rata'));
      const lane='.weba-swimlane:nth-child(2)';
      await page.click(lane+' .weba-add-list');
      await page.locator(lane+' .weba-structure-composer input').fill('Katselmointi');
      await page.click(lane+' .weba-structure-composer button:not(.weba-popup-close)'); await settle();
      await page.waitForFunction(()=>[...document.querySelectorAll('.weba-column h4')].some(e=>e.textContent==='Katselmointi'));
      const custom=lane+' .weba-column:nth-child(2)';
      await page.click(custom+' .weba-add-card-bottom'); await settle(); await visible('Editor');
      assert.equal(await page.$eval(entry('Lane'),e=>e.value),'Tyhjä rata');
      assert.equal(await page.$eval(entry('Status'),e=>e.value),'Katselmointi');
      await fill('CardTitle','Inline action card'); await click('SaveCard'); await click('CloseEditor');
      await page.waitForSelector(custom+' .weba-card');
      await page.click(custom+' .weba-card'); await settle(); await visible('Editor');
      assert.equal(await page.$eval(entry('CardTitle'),e=>e.value),'Inline action card');
      await click('CloseEditor');
      await page.click(lane+' .weba-collapse-lane');
      assert.equal(await page.$eval(lane+' .weba-columns',e=>e.hidden),true);
      await page.click(lane+' .weba-collapse-lane');
      await shot('weba-swimlanes');
      await click('Home');await page.click('.weba-board-tile');await settle();
      await page.waitForSelector(custom+' .weba-card');
      await page.setViewport({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile board stays within the viewport');
      await shot('weba-swimlanes-mobile');
      console.log('Browser swimlanes: default view, header/footer geometry, native card editor, custom empty lanes/lists, persistence and mobile checks passed');
      return;
    }
    await click('ViewMenu');
    const views = await page.$eval('[id$=".Views"]', e => [...e.querySelectorAll('button:not(.weba-popup-close)')].map(b=>b.textContent.trim()));
    assert.deepEqual(views,['Swimlanes','Lists','Calendar','Gantt','Table','Charts']);
    await click('Calendar');
    await page.waitForSelector('.weba-calendar');
    await shot('weba-calendar');
    await click('ViewMenu'); await click('Kanban');
    await click('SidebarToggle'); await click('NewCard');
    await visible('Editor');
    await fill('CardTitle','Layout card');
    await fill('Description','Native Gambas fields in a card panel');
    await click('SaveCard');
    await page.waitForFunction(()=>document.querySelector('.weba-card strong')?.textContent==='Layout card');
    await page.waitForFunction(() => {
      let active=document.activeElement;
      while(active && (!active.id || active.id.includes(':'))) active=active.parentElement;
      const outline=document.getElementById('gw-focus');
      if(!active || !outline) return false;
      const a=active.getBoundingClientRect(), b=outline.getBoundingClientRect();
      return Math.abs(a.left-b.left)<2 && Math.abs(a.top-b.top)<2;
    });
    await shot('weba-card');
    await click('CloseEditor'); await click('CloseSidebar');
    await click('AccountToggle'); await click('Admin');
    await visible('AdminNavigation');
    await click('PasswordLength'); await visible('PasswordPolicyPanel');
    await shot('weba-admin');
    await click('Home');
    await click('ToggleNavigation');
    assert.equal(await page.$eval('[id$=".LeftNavigation"]', e=>e.getBoundingClientRect().width),0);
    await click('ToggleNavigation');
    await page.setViewport({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile must not overflow');
    await click('SidebarToggle'); await visible('PageSidebar'); await shot('weba-mobile'); await click('CloseSidebar');
    console.log('Browser layout: header/nav/content/sidebar order, board tiles, view menu, card editor, admin and mobile checks passed');
    await click('AccountToggle');
    await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}), page.locator(selector('Logout')).click()]);
    await settle();
  } catch(error) {await shot('weba-failure'); throw error;} finally {await context.close(); await browser.disconnect();}
})().catch(error=>{console.error(error);process.exitCode=1;});
