// Cross-container single-board drops; sorted placement is independent of order.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const dom=new JSDOM(`<main class="weba-shell"><nav><div class="weba-space-row" data-workspace-id="7" data-workspace-parent="0">Space</div><button id="@1.Remaining">Remaining</button><button id="@1.Starred">Starred</button><button id="@1.Archive">Archive</button></nav><section class="weba-content" data-drag="@1.DragAction" data-board-drop="true" data-board-reorder="false" data-board-source="remaining"><div class="weba-data"><div class="weba-board-tile-group" data-board-id="101"><button class="weba-drag-handle" data-drag-kind="board"></button><button class="weba-board-tile">Alpha</button></div></div></section></main>`,{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,calls=[];w.TextEncoder=TextEncoder;w.gw={update:(...args)=>calls.push(args)};w.matchMedia=()=>({matches:false});
let allow=true,confirms=0;w.confirm=()=>{confirms++;return allow;};
const section=d.querySelector('.weba-content'),group=d.querySelector('.weba-board-tile-group'),handle=d.querySelector('.weba-drag-handle'),surface=d.querySelector('.weba-board-tile');
const targets=[d.querySelector('.weba-space-row'),...['Remaining','Starred','Archive'].map(name=>d.getElementById('@1.'+name))];
const rect=(x,y,width=180,height=40)=>({left:x,top:y,right:x+width,bottom:y+height,width,height});
section.getBoundingClientRect=()=>rect(250,0,400,400);group.getBoundingClientRect=()=>rect(300,20,210,110);handle.getBoundingClientRect=()=>rect(300,110,30,30);
targets.forEach((target,index)=>target.getBoundingClientRect=()=>rect(0,index*50));
d.elementFromPoint=(x,y)=>x<0?d.body:x>200?group:targets[Math.floor(y/50)]||d.body;
w.eval(fs.readFileSync(path.join(__dirname,'../WeKan/.public/drag.js'),'utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
function event(type,target,x,y,extra={}){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,button:0,...extra});target.dispatchEvent(e);}
function drop(index,cancel=false){event('pointerdown',handle,315,125);event('pointermove',d,80,index*50+20);event(cancel?'pointercancel':'pointerup',d,80,index*50+20);}
function decoded(){const parts=calls.at(-1)[2].split('|');assert.equal(parts.shift(),'board-drop');return parts.map(value=>Buffer.from(value,'base64').toString());}
assert.equal(w.webaDrag.identify(surface,'touch'),null);assert.equal(w.webaDrag.identify(surface,'mouse'),null,'handle mode refuses the sorted board surface');surface.classList.add('weba-board-drag-surface');assert.equal(w.webaDrag.identify(surface,'touch').kind,'board');assert.equal(w.webaDrag.identify(surface,'mouse').kind,'board','handle-off sorted board surface can place boards');surface.classList.remove('weba-board-drag-surface');assert.equal(w.webaDrag.identify(handle,'touch').kind,'board','sorted mode can place boards from its visible grip');
for(const [index,target,id] of [[0,'workspace','7'],[1,'remaining','0'],[2,'starred','0'],[3,'archive','0']]){drop(index);assert.deepEqual(decoded(),['101',target,id,'']);assert.equal(d.querySelector('.weba-board-drop-target'),null);}
const baseline=calls.length;allow=false;drop(3);assert.equal(calls.length,baseline,'declining archive does not send');assert.equal(confirms,2);allow=true;
section.dataset.boardSource='starred';drop(2);assert.equal(calls.length,baseline,'Starred cannot be its own add-star source');
section.dataset.boardSource='archive';for(const index of [2,3])drop(index);assert.equal(calls.length,baseline,'Archive cannot star/archive itself');
drop(0);assert.deepEqual(decoded(),['101','workspace','7','']);drop(1);assert.deepEqual(decoded(),['101','remaining','0','']);
const beforeCancel=calls.length;drop(0,true);event('pointerdown',handle,315,125);event('pointermove',d,-20,20);event('pointerup',d,-20,20);assert.equal(calls.length,beforeCancel,'cancel/outside do not send');
handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));assert.equal(calls.length,beforeCancel,'sorted keyboard does not reorder');
event('pointerdown',handle,315,125);event('pointermove',d,400,70);event('pointerup',d,400,70);assert.equal(calls.length,beforeCancel,'sorted grid has no reorder target');
section.dataset.boardSource='remaining';section.dataset.multiActive='true';section.dataset.selectionRevision='12';section.dataset.selectionCount='3';group.dataset.selected='true';
assert.deepEqual({...w.webaDrag.identify(handle,'touch').group},{revision:'12',count:'3'});
event('pointerdown',handle,315,125);event('pointermove',d,80,20);
assert.equal(d.querySelector('.weba-multidrag-count').textContent,'3');
// A concurrent refresh cannot silently replace the captured revision.
section.dataset.selectionRevision='13';event('pointerup',d,80,20);
let multi=calls.at(-1)[2].split('|');assert.equal(multi.shift(),'board-multi-drop');assert.deepEqual(multi.map(value=>Buffer.from(value,'base64').toString()),['101','workspace','7','12']);
section.dataset.boardReorder='true';const grouped=calls.length;
event('pointerdown',handle,315,125);event('pointermove',d,400,70);event('pointerup',d,400,70);
handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));assert.equal(calls.length,grouped,'group cannot fall back to grid reorder');
group.dataset.selected='false';drop(0);assert.deepEqual(decoded(),['101','workspace','7','']);
section.dataset.boardReorder='false';section.dataset.boardDrop='false';assert.equal(w.webaDrag.identify(handle,'touch'),null);w.close();
console.log('Board drop gestures: sorted workspace/Remaining/Starred/Archive wire, add-star source limits, restore targets, archive confirmation, scroll/cancel/outside and no sorted reorder passed');
