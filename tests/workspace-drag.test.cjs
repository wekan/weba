// Workspace gestures use the original quarter-row drop rule and native wire.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const row=(id,parent,name)=>`<div class="weba-space-row" data-workspace-id="${id}" data-workspace-parent="${parent}"><button class="weba-drag-handle weba-space-drag" data-drag-kind="workspace"></button><button class="weba-space-open">${name}</button><button class="weba-space-menu">Menu</button></div>`;
const dom=new JSDOM(`<main class="weba-shell"><nav>${row(10,0,'A')}${row(11,10,'Child')}${row(20,0,'B')}${row(30,0,'C')}</nav><section class="weba-content" data-workspace-reorder="true" data-drag="@1.DragAction"></section></main>`,{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,calls=[];w.TextEncoder=TextEncoder;w.gw={update:(...args)=>calls.push(args)};
w.matchMedia=()=>({matches:false});
const rows=[...d.querySelectorAll('.weba-space-row')],section=d.querySelector('.weba-content');
rows.forEach((row,index)=>{row.getBoundingClientRect=()=>({left:0,right:240,top:index*50,bottom:index*50+50,width:240,height:50});});
d.elementFromPoint=(x,y)=>x<0||y<0?d.body:rows.find(row=>y>=row.getBoundingClientRect().top&&y<row.getBoundingClientRect().bottom)||d.body;
w.eval(fs.readFileSync(path.join(__dirname,'../WeKan/.public/drag.js'),'utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
const event=(type,target,x,y,extra={})=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,button:0,...extra});target.dispatchEvent(e);};
const surface=rows[3].querySelector('.weba-space-open'),handle=rows[3].querySelector('.weba-space-drag');
const decode=()=>{const parts=calls.at(-1)[2].split('|');assert.equal(parts.shift(),'workspace');return parts.map(value=>Buffer.from(value,'base64').toString());};
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/workspacesTree.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
assert.ok(source,'Original workspace drop helper required');const helper=require(path.join(source,'models/lib/workspacesTree.js'));
for(const y of [null,undefined,-1,0,24.9,25,50,75,75.1,100,Infinity,NaN])for(const height of [null,undefined,0,-1,100,Infinity,NaN])assert.equal(w.webaDrag.workspaceDropPosition(y,height),helper.dropPosition(y,height));
assert.equal(w.webaDrag.identify(surface,'touch'),null,'ordinary touch scrolls workspace names');assert.equal(w.webaDrag.identify(surface,'mouse').kind,'workspace');assert.equal(w.webaDrag.identify(handle,'touch').kind,'workspace');assert.equal(w.webaDrag.identify(rows[3].querySelector('.weba-space-menu'),'mouse'),null,'menus do not initiate sorting');
event('pointerdown',surface,20,175);event('pointermove',d,20,25);event('pointerup',d,20,25);assert.equal(calls.length,0);
for(const [y,position] of [[5,'before'],[25,'inside'],[45,'after']]){
 event('pointerdown',surface,20,175,{pointerType:'mouse'});event('pointermove',d,20,y,{pointerType:'mouse'});assert.ok(rows[0].classList.contains('weba-space-drop-'+position));event('pointerup',d,20,y,{pointerType:'mouse'});assert.deepEqual(decode(),['30','10',position,'']);assert.equal(d.querySelector('[class*="weba-space-drop-"]'),null,'drop marks removed');
}
event('pointerdown',handle,20,175);event('pointermove',d,20,125);event('pointerup',d,20,125);assert.deepEqual(decode(),['30','20','inside','']);
const before=calls.length;
for(const cancellation of ['pointercancel','multitouch','outside','escape']){
 event('pointerdown',handle,20,175);event('pointermove',d,20,125);
 if(cancellation==='pointercancel')event('pointercancel',d,20,125);
 if(cancellation==='multitouch')event('pointerdown',d,20,125,{pointerId:2,isPrimary:false});
 if(cancellation==='outside')event('pointerup',d,-20,125);
 if(cancellation==='escape')d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(calls.length,before);assert.equal(w.webaDrag.active,false);assert.equal(d.querySelector('.weba-drag-ghost'),null);
}
const a=rows[0].querySelector('.weba-space-drag');event('pointerdown',a,20,25);event('pointermove',d,20,75);event('pointerup',d,20,75);assert.equal(calls.length,before,'descendant drop refused');
for(const [key,expected] of [['ArrowUp',['30','20','before','']],['ArrowRight',['30','20','inside','']]]){handle.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));assert.deepEqual(decode(),expected);}
rows[1].querySelector('.weba-space-drag').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.deepEqual(decode(),['11','10','after','']);
rows[3].style.direction='rtl';handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.deepEqual(decode(),['30','20','inside',''],'RTL left indents');rows[3].style.direction='';
rows[1].style.direction='rtl';rows[1].querySelector('.weba-space-drag').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.deepEqual(decode(),['11','10','after',''],'RTL right outdents');rows[1].style.direction='';
section.dataset.workspaceReorder='false';assert.equal(w.webaDrag.identify(handle,'touch'),null,'non-overview cannot start workspace drag');section.dataset.workspaceReorder='true';
const count=calls.length;event('pointerdown',handle,20,175);event('pointermove',d,20,125);rows[3].remove();event('pointerup',d,20,125);assert.equal(calls.length,count,'replacement/disconnected origin cancels');
w.close();console.log('Workspace gestures: original quarter-row rule, mouse surface/touch-handle wire, menu/scroll separation, cycle/cancel/outside/replacement guards, marks and keyboard wire passed');
