const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {summary, monthDays} = require('../WeKan/.public/kanban.js');
assert.deepEqual(summary([{status:'Todo'},{status:'Done'},{status:'Todo'}]).map(x=>x.count),[2,0,1]);
assert.deepEqual(summary([]).map(x=>x.count),[0,0,0]);
assert.equal(summary([{status:'Review'}]).find(item=>item.status==='Review').count,1,'charts count custom lists');
assert.equal(monthDays(2024,1),29);
assert.equal(monthDays(2025,1),28);
const dom = new JSDOM('<section class="weba-content"><div class="weba-data"></div><div class="weba-report"></div></section>');
global.document = dom.window.document;
const section = document.querySelector('section'), data = section.querySelector('.weba-data');
const hostile = '<img src=x onerror=alert(1)>';
for (const [status,lane,due] of [['Todo','A','2026-11-06'],['Doing','B',''],['Done','A','2026-12-01']]) {
 const card = document.createElement('article'); card.className='weba-card';
 Object.assign(card.dataset,{status,lane,due});
 const title=document.createElement('strong'); title.textContent=hostile; card.append(title); data.append(card);
}
for (const view of ['Lists','Swimlanes','Table','Calendar','Gantt','Charts','Boards']) {
 section.dataset.view=view; global.webaRender();
 const report=section.querySelector('.weba-report');
 if(view==='Lists') assert.equal(report.querySelectorAll('.weba-column').length,3);
 if(view==='Swimlanes') assert.equal(report.querySelectorAll('.weba-column').length,6);
 if(view==='Table'||view==='Gantt') assert.equal(report.querySelectorAll('tbody tr').length,3);
 if(view==='Calendar') {
  assert.ok(report.querySelectorAll('.weba-day').length>=28);
  const before=report.querySelector('.weba-calendar-controls strong').textContent;
  report.querySelector('button').click();
  assert.notEqual(report.querySelector('.weba-calendar-controls strong').textContent,before);
 }
 if(view==='Charts') assert.deepEqual([...report.querySelectorAll('meter')].map(m=>m.value),[1,1,1]);
 assert.equal(report.querySelectorAll('img,script').length,0,'user titles must remain text');
 // Re-rendering must replace reports, not duplicate them.
 const count=report.children.length; global.webaRender(); assert.equal(report.children.length,count);
}
console.log('Report calculations, DOM views, month navigation, repeated renders and HTML injection tests passed');

// Translation must never change a card title or a custom swimlane name.
global.webaI18n = {t:text=>'translated:'+text, language:'fi'};
const protectedCard = data.querySelector('.weba-card');
protectedCard.querySelector('strong').textContent='Todo';
protectedCard.dataset.lane='Doing';
section.dataset.view='Table'; global.webaRender();
const cells=[...section.querySelectorAll('.weba-report tbody tr:first-child td')].map(e=>e.textContent);
assert.equal(cells[0],'Todo');
assert.equal(cells[1],'translated:Todo');
assert.equal(cells[2],'Doing');
section.dataset.view='Swimlanes'; global.webaRender();
assert.equal(section.querySelector('.weba-report h3').textContent,'Doing');
delete global.webaI18n;
console.log('Translated reports preserve card titles and custom swimlane names');

section.dataset.view='Swimlanes';section.dataset.editable='true';section.dataset.action='@1.BoardAction';
section.dataset.board='test';
const layout=document.createElement('div');layout.className='weba-layout';layout.hidden=true;
layout.innerHTML='<section data-lane="Empty"><span data-list="Todo"></span><span data-list="Username"></span></section>';
section.prepend(layout);
global.webaRender();
const empty=[...section.querySelectorAll('.weba-swimlane')].find(e=>e.querySelector('h3').textContent==='Empty');
assert.ok(empty,'empty swimlane stays visible');
assert.equal(empty.querySelectorAll('.weba-column').length,2);
assert.equal(empty.querySelectorAll('h4')[1].textContent,'Username','custom list title stays unchanged');
const header=empty.querySelector('.weba-list-controls');
assert.deepEqual([...header.querySelectorAll('button')].map(e=>e.className.split(' ').pop()),['weba-collapse-list','weba-drag-handle','weba-add-card-top','weba-list-menu','weba-add-list']);
const calls=[];global.gw={update:(...args)=>calls.push(args)};
empty.querySelector('.weba-add-card-bottom').click();
assert.equal(calls[0][0],'@1.BoardAction');
assert.equal(calls[0][2].split('|')[0],'card');
assert.equal(Buffer.from(calls[0][2].split('|')[1],'base64').toString(),'Empty');
empty.querySelector('.weba-add-list').click();
const composer=empty.querySelector('.weba-structure-composer');
assert.equal(composer.previousElementSibling,empty.querySelector('.weba-column'),'composer follows selected list');
composer.querySelector('input').value='Katselmointi';
composer.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
assert.equal(calls.at(-1)[2].split('|')[0],'list');
assert.equal(Buffer.from(calls.at(-1)[2].split('|')[3],'base64').toString(),'Katselmointi');
empty.querySelector('.weba-collapse-lane').click();
assert.equal(empty.querySelector('.weba-columns').hidden,true);
assert.equal(empty.querySelector('.weba-collapse-lane').getAttribute('aria-expanded'),'false');
section.dataset.editable='false';global.webaRender();
assert.equal(section.querySelectorAll('.weba-add-card-top,.weba-add-card-bottom,.weba-add-list,.weba-add-lane').length,0,'archived board has no creation actions');
delete global.gw;
console.log('Swimlane/list controls, empty layouts, composer placement, action routing and archived-board UI passed');

section.dataset.board='17';
[...data.querySelectorAll('.weba-card')].forEach((card,index)=>{card.dataset.cardKey=`c${index+1}:17`;card.dataset.cardId=String(index+1);});
for(const view of ['Table','Calendar','Gantt']){
 section.dataset.view=view;global.webaRender();
 const links=[...section.querySelectorAll('.weba-report a.weba-card-link')];
 assert.ok(links.length,'report exposes real card anchors');
 for(const link of links){assert.match(link.getAttribute('href'),/^\/b\/17\/board\/[1-3]$/);assert.match(link.dataset.cardId,/^[1-3]$/);assert.equal(link.classList.contains('weba-user-text'),true);assert.equal(link.querySelectorAll('img,script').length,0,'literal titles cannot introduce HTML');}
}
console.log('Table/Calendar/Gantt card anchors preserve canonical scope, literal titles and safe report navigation');
