const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {summary, monthDays} = require('../WeKan/.public/kanban.js');
assert.deepEqual(summary([{status:'Todo'},{status:'Done'},{status:'Todo'}]).map(x=>x.count),[2,0,1]);
assert.deepEqual(summary([]).map(x=>x.count),[0,0,0]);
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
