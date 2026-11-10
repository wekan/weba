'use strict';
(async()=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
 const code=fs.readFileSync(path.join(__dirname,'../WeKan/.public/drag-handle-preference.js'),'utf8');
 for(const points of [0,1])for(const pref of ['auto','true','false','corrupt']){
  const dom=new JSDOM('<span data-weba-drag-preference="'+pref+'"></span><button class="weba-drag-preference-toggle" data-command="private" data-revision="7"><span data-caption="Show desktop drag handles"></span></button><div class="weba-view-order-list"><button class="weba-view-order-handle"></button><button class="weba-view-order-label"></button></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document,sent=[];Object.defineProperty(w.navigator,'maxTouchPoints',{value:points});w.gw={update:(...v)=>sent.push(v)};w.webaI18n={t:s=>'translated '+s};w.eval(code);d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const expected=pref==='true'?true:pref==='false'?false:!!points,handle=d.querySelector('.weba-view-order-handle'),label=d.querySelector('.weba-view-order-label'),toggle=d.querySelector('.weba-drag-preference-toggle');assert.equal(w.webaDragPreference.enabled(),expected);assert.equal(handle.hidden,!expected);assert.equal(label.classList.contains('weba-view-order-surface'),!expected);assert.equal(toggle.getAttribute('aria-checked'),String(expected));toggle.click();assert.deepEqual(sent[0],['private','text','7|'+String(!expected),null]);
  d.querySelector('[data-weba-drag-preference]').dataset.webaDragPreference=String(!expected);await new Promise(r=>w.setTimeout(r,0));assert.equal(handle.hidden,expected);assert.equal(toggle.getAttribute('aria-checked'),String(!expected));assert.equal(sent.length,1,'refresh must not write');assert.equal(toggle.textContent,'translated Show desktop drag handles');w.close();
 }
 console.log('Drag handle browser decisions: mouse/touch unset, explicit true/false, malformed fallback, exact toggle wire, no-write live sync, surfaces and translated captions passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
