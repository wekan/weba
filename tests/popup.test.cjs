(async()=>{
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM('<button id="trigger">Add card</button><div class="weba-editor"></div>',{runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
const {window}=dom;window.eval(fs.readFileSync(require('node:path').join(__dirname,'../WeKan/.public/popup.js'),'utf8'));
const panel=window.document.querySelector('.weba-editor'),trigger=window.document.querySelector('button');
let rect;
trigger.getBoundingClientRect=()=>rect;
panel.getBoundingClientRect=()=>({left:parseFloat(panel.style.left)||0,top:parseFloat(panel.style.top)||0,width:parseFloat(panel.style.width)||340,height:Math.min(700,parseFloat(panel.style.maxHeight)||700)});
for(const [width,height,left,top] of [[1440,1000,400,100],[1440,1000,1400,950],[390,844,220,500],[844,390,700,300]]){
  window.innerWidth=width;window.innerHeight=height;rect={left,right:left+28,top,bottom:top+28};
  window.webaPopup.near(panel,trigger);
  const r=panel.getBoundingClientRect();
  assert.ok(r.left>=8 && r.top>=8,'popup starts inside viewport');
  assert.ok(r.left+r.width<=width-8 && r.top+r.height<=height-8,'whole popup fits viewport');
  if(height===1000&&top===100)assert.equal(r.top,rect.bottom+6,'popup opens beside its trigger when space permits');
}
window.visualViewport={width:360,height:280,offsetLeft:10,offsetTop:120,addEventListener(){}};
window.webaPopup.position(panel,{rect:{left:500,top:500,bottom:528}});
const r=panel.getBoundingClientRect();assert.ok(r.top>=128&&r.top+r.height<=392,'visual viewport keyboard/zoom bounds respected');
const close=window.webaPopup.closeButton(panel,()=>panel.remove());
assert.equal(close.type,'button');assert.ok(close.classList.contains('fa-times-thin'));assert.equal(close.getAttribute('aria-label'),'Close');
close.click();assert.equal(panel.isConnected,false);
// A late stylesheet can change width without a resize/DOM attribute mutation.
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
window.visualViewport=undefined;window.innerWidth=390;window.innerHeight=844;
const late=window.document.createElement('div');late.id='fixture.Views';window.document.body.append(late);
let lateWidth=100;
late.getBoundingClientRect=()=>({left:parseFloat(late.style.left)||0,top:parseFloat(late.style.top)||0,width:lateWidth,height:180});
rect={left:350,right:378,top:20,bottom:48};
const sheet=window.document.createElement('link');sheet.rel='stylesheet';window.document.head.append(sheet);
window.webaPopup.near(late,trigger);
const frames=()=>new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
await frames();lateWidth=210;
assert.ok(late.getBoundingClientRect().left+lateWidth>390,'fixture reproduces stale width positioning');
sheet.dispatchEvent(new window.Event('load'));
await frames();
assert.ok(late.getBoundingClientRect().left+lateWidth<=382,'loaded stylesheet repositions to actual width');
// The native reply may reveal a popup by class after the click frame completed.
const delayed=window.document.createElement('div');delayed.id='fixture.BoardSortMenu';delayed.className='gw-hidden';delayed.style.left='350px';window.document.body.append(delayed);
delayed.getBoundingClientRect=()=>({left:parseFloat(delayed.style.left)||0,top:parseFloat(delayed.style.top)||0,width:delayed.classList.contains('gw-hidden')?0:210,height:delayed.classList.contains('gw-hidden')?0:180});
window.webaPopup.near(delayed,trigger);await frames();
delayed.classList.remove('gw-hidden');await frames();
assert.ok(delayed.getBoundingClientRect().left+210<=382,'class-only native reveal must position after delayed response');
window.close();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(errors,[],'popup teardown must not emit async errors');
console.log('Popup placement: anchored desktop, viewport edges, mobile/landscape, visual viewport, late stylesheet/class-only native reveal, async teardown and close actions passed');

})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
