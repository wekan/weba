const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require('jsdom');
const dom=new JSDOM(`<section class="weba-content" data-board="1" data-view="Swimlanes" data-editable="true" data-drag="@1.DragAction"><div class="weba-report"><section class="weba-swimlane" data-lane="Default"><div class="weba-columns"><section class="weba-column" data-lane="Default" data-list="Todo"><div class="weba-list-body"><article class="weba-card" data-card-id="1"><button class="weba-drag-handle" data-drag-kind="card">Move</button>One</article><article class="weba-card" data-card-id="2">Two</article></div></section><section class="weba-column" data-lane="Toinen äärata" data-list="Doing"><div class="weba-list-body"></div></section></div></section></div></section>`,{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,calls=[];w.TextEncoder=TextEncoder;w.gw={update:(...args)=>calls.push(args)};
w.matchMedia=()=>({matches:true});w.confirm=()=>true;
const root=d.querySelector('.weba-content'),cards=[...d.querySelectorAll('.weba-card')],handle=d.querySelector('button'),columns=[...d.querySelectorAll('.weba-column')];
const rect=(left,top,width=250,height=80)=>({left,top,right:left+width,bottom:top+height,width,height});
root.getBoundingClientRect=()=>rect(0,0,600,400);
columns[0].getBoundingClientRect=()=>rect(0,0,250,400);columns[1].getBoundingClientRect=()=>rect(300,0,250,400);
columns.forEach(e=>e.querySelector('.weba-list-body').getBoundingClientRect=e.getBoundingClientRect);
cards.forEach((e,i)=>e.getBoundingClientRect=()=>rect(0,20+i*100));handle.getBoundingClientRect=()=>rect(0,20,28,28);
d.elementFromPoint=(x,y)=>x<0?d.body:x>280?columns[1].firstElementChild:columns[0].firstElementChild;
w.eval(fs.readFileSync(path.join(__dirname,'../WeKan/.public/drag.js'),'utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
function event(type,target,x,y,extra={}){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,button:0,...extra});target.dispatchEvent(e);}
assert.equal(w.webaDrag.identify(cards[0],'touch'),null,'ordinary card touch remains native scroll');
assert.equal(w.webaDrag.identify(cards[0],'mouse'),null,'handle mode refuses mouse card surface too');
assert.equal(w.webaDrag.identify(handle,'touch').kind,'card');
const cardLink=d.createElement('a');cardLink.className='weba-card-link';cardLink.innerHTML='<strong>One</strong>';cards[0].append(cardLink);
assert.equal(w.webaDrag.identify(cardLink.firstElementChild,'mouse'),null,'handle mode refuses card-link mouse starts');
assert.equal(w.webaDrag.identify(cardLink.firstElementChild,'touch'),null,'ordinary card-link touch keeps native scroll');
const otherLink=d.createElement('a');otherLink.textContent='External';cards[0].append(otherLink);
assert.equal(w.webaDrag.identify(otherLink,'mouse'),null,'unrelated links do not start card drags');
cards[0].classList.add('weba-card-drag-surface');
assert.equal(w.webaDrag.identify(cards[0],'touch').kind,'card','handle-off card surface supports touch');
assert.equal(w.webaDrag.identify(cardLink.firstElementChild,'mouse').kind,'card','handle-off native card link supports mouse');
assert.equal(w.webaDrag.identify(otherLink,'touch'),null,'handle-off unrelated links remain interactive');
let deferred,opened=0;const nativeTimeout=w.setTimeout;w.setTimeout=fn=>{deferred=fn;return 1;};cards[0].onclick=()=>opened++;
event('pointerdown',cards[0],10,30);event('pointerup',cards[0],10,30);cards[0].click();deferred();assert.equal(opened,1,'native card click suppresses the no-click fallback duplicate');
event('pointerdown',cards[0],10,30);event('pointerup',cards[0],10,30);deferred();assert.equal(opened,2,'handle-off touch tap falls back to one card click when Chromium omits it');
w.setTimeout=nativeTimeout;cards[0].onclick=null;
cards[0].classList.remove('weba-card-drag-surface');

event('pointerdown',cards[0],10,30);event('pointermove',d,330,80);event('pointerup',d,330,80);assert.equal(calls.length,0);
event('pointerdown',handle,10,30);event('pointermove',d,14,32);event('pointerup',d,14,32);assert.equal(calls.length,0,'small movement is not a drag');
event('pointerdown',handle,10,30);event('pointermove',d,330,80);assert.equal(w.webaDrag.active,true);event('pointerup',d,330,80);
assert.equal(calls.length,1);const wire=calls[0][2].split('|');assert.equal(wire[0],'card');assert.deepEqual(wire.slice(1).map(s=>Buffer.from(s,'base64').toString()),['1','Toinen äärata','Doing','0']);
assert.equal(d.querySelector('.weba-drag-ghost'),null);assert.equal(d.querySelector('.weba-drop-placeholder'),null);assert.equal(cards[0].classList.contains('weba-drag-origin'),false);
for(const cancel of ['pointercancel','multitouch','outside']){
  event('pointerdown',handle,10,30);event('pointermove',d,330,80);
  if(cancel==='pointercancel')event('pointercancel',d,330,80);
  if(cancel==='multitouch')event('pointerdown',d,330,80,{pointerId:2,isPrimary:false});
  if(cancel==='outside')event('pointerup',d,-20,80);
  assert.equal(w.webaDrag.active,false);assert.equal(calls.length,1,'canceled/invalid drops do not write');
}
root.dataset.editable='false';assert.equal(w.webaDrag.identify(handle,'touch'),null,'archive/read-only view cannot drag');
root.dataset.cardMove='true';
assert.equal(w.webaDrag.identify(handle,'touch').kind,'card','Worker can drag cards without general write access');
event('pointerdown',handle,10,30);event('pointermove',d,330,80);event('pointerup',d,330,80);
assert.equal(calls.length,2,'Worker card drop reaches the authoritative server guard');
const listHandle=d.createElement('button');listHandle.dataset.dragKind='list';columns[0].append(listHandle);
assert.equal(w.webaDrag.identify(listHandle,'touch'),null,'Worker cannot drag lists');
listHandle.remove();delete root.dataset.cardMove;calls.pop();
root.dataset.editable='true';const key=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});handle.dispatchEvent(key);assert.equal(calls.length,2,'keyboard handle can move a card');
cards[0].classList.add('weba-card-drag-surface');cards[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(calls.length,3,'handle-off card surface can move a card with the keyboard');cards[0].classList.remove('weba-card-drag-surface');
columns[0].dataset.listId='11';columns[1].dataset.listId='22';
handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
assert.equal(Buffer.from(calls.at(-1)[2].split('|')[3],'base64').toString(),'#22','keyboard targets stable list identity');
// Personal board order is independent of shared board write capabilities.
const grid=d.createElement('div');grid.className='weba-data';root.append(grid);
const groups=[101,102,103].map((id,index)=>{const e=d.createElement('div');e.className='weba-board-tile-group';e.dataset.boardId=String(id);e.innerHTML='<button class="weba-board-tile">Board</button><button class="weba-drag-handle" data-drag-kind="board">Move</button>';e.getBoundingClientRect=()=>rect(index*210,20,200,120);grid.append(e);return e;});
grid.getBoundingClientRect=()=>rect(0,0,640,300);root.dataset.editable='false';root.dataset.boardReorder='true';
d.elementFromPoint=(x,y)=>x<0?d.body:groups[Math.min(2,Math.floor(x/210))];
const boardHandle=groups[2].querySelector('.weba-drag-handle'),tile=groups[2].querySelector('.weba-board-tile');
assert.equal(w.webaDrag.identify(tile,'touch'),null,'ordinary board touch stays scrollable');
assert.equal(w.webaDrag.identify(tile,'mouse'),null,'handle mode refuses mouse board surface too');
tile.classList.add('weba-board-drag-surface');
assert.equal(w.webaDrag.identify(tile,'touch').kind,'board','handle-off board surface supports touch reorder');
assert.equal(w.webaDrag.identify(tile,'mouse').kind,'board','handle-off board surface supports mouse reorder');
tile.classList.remove('weba-board-drag-surface');
assert.equal(w.webaDrag.identify(boardHandle,'touch').kind,'board','readonly board member can reorder personal view');
const baseline=calls.length;
event('pointerdown',boardHandle,430,30);event('pointermove',d,10,30);event('pointerup',d,10,30);
assert.equal(calls.length,baseline+1);let boardWire=calls.at(-1)[2].split('|');assert.equal(boardWire[0],'board');assert.deepEqual(boardWire.slice(1).map(x=>Buffer.from(x,'base64').toString()),['103','','','101']);
for(const cancel of ['pointercancel','multitouch','outside','escape']){
 event('pointerdown',boardHandle,430,30);event('pointermove',d,10,30);
 if(cancel==='pointercancel')event('pointercancel',d,10,30);
 if(cancel==='multitouch')event('pointerdown',d,10,30,{isPrimary:false,pointerId:2});
 if(cancel==='outside'){event('pointermove',d,-10,30);event('pointerup',d,-10,30);}
 if(cancel==='escape')boardHandle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(calls.length,baseline+1,'cancelled board gesture must not write');assert.equal(d.querySelector('.weba-drag-ghost'),null);assert.equal(d.querySelector('.weba-drop-placeholder'),null);
}
groups.forEach(e=>e.style.direction='rtl');groups[0].querySelector('.weba-drag-handle').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
boardWire=calls.at(-1)[2].split('|');assert.deepEqual(boardWire.slice(1).map(x=>Buffer.from(x,'base64').toString()),['101','','','103'],'RTL keyboard moves in visual direction');
root.dataset.boardReorder='false';assert.equal(w.webaDrag.identify(boardHandle,'touch'),null,'sorted/archive board mode has no reorder gesture');
w.close();console.log('Drag gestures: handle-on grip and handle-off card mouse/touch/keyboard surface, scrolling, threshold, UTF-8 targets, cancel/multitouch, invalid/read-only drops and cleanup passed');
