const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<button id="trigger">Add card</button><div class="weba-editor"></div>',{runScripts:'outside-only',pretendToBeVisual:true});
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
window.close();
console.log('Popup placement: anchored desktop, viewport edges, mobile/landscape, visual viewport and close actions passed');
