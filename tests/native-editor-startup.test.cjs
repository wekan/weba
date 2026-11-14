'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../WeKan/.public/native-editor-startup.js'),'utf8');
function scene(){
 const dom=new JSDOM('<div id="@2.OverviewRouteState">{"boardId":"4","cardId":"3"}</div><div id="@2.Editor"><div id="@2.Description"><input id="@2.Description:entry" value="before"></div><textarea id="@2.Labels">before</textarea><button id="@2.SaveCard">Save</button></div><input id="@2.WebTextPass:entry" value="secret">',{runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.TextDecoder=TextDecoder;
 const updates=[],callbacks=[],raised=[];
 w.gw={commands:[],updates:{},answer(xhr){xhr.run?.();},setOuterHtml(id,html){d.getElementById(id).outerHTML=html;},textbox:{onUpdate(id){w.gw.updates[id]=()=>updates.push([id,d.getElementById(id+':entry').value]);}},textarea:{onUpdate(id){w.gw.updates[id]=()=>updates.push([id,d.getElementById(id).value]);}}};
 w.gw.update=(id,prop,value)=>updates.push([id,value]);
 w.gw.command=fn=>{callbacks.push(fn);w.gw.commands.push(null,fn);};
 w.gw.raise=(...args)=>raised.push(args);
 for(const name of ['textbox','textarea'])w.gw[name].setText=(id,value)=>w.gw.command(()=>{d.getElementById(id+(name==='textbox'?':entry':'')).value=value;w.gw.update(id,'text',value);});
 const flush=()=>{while(callbacks.length)callbacks.shift()();w.gw.commands=[];};
 w.eval(source);
 const get=name=>d.getElementById('@2.'+name+(name==='Labels'?'':':entry'));
 const type=(value,name='Description')=>{const input=get(name);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const replace=(value,name='Description',attrs='')=>w.gw.setOuterHtml('@2.'+name,name==='Labels'?'<textarea id="@2.Labels" '+attrs+'>'+value+'</textarea>':'<div id="@2.Description"><input id="@2.Description:entry" value="'+value+'" '+attrs+'></div>');
 const answer=(command,run,remaining=[])=>w.gw.answer({readyState:4,gw_command:command,run(){run?.();w.gw.commands=remaining;}});
 return{w,d,get,type,replace,answer,updates,flush,raised,close:()=>w.close()};
}
const open=['raise',null,'open',[],false],route=['update','@2.EntryRouteAction','text','board|1|4|3',true],save=['raise','@2.SaveCard','click',[],false];
for(const name of ['Description','Labels']){
 const s=scene(),value="early\0Ω😀'";s.type(value,name);
 s.answer(open,()=>{s.replace('baseline',name);s.replace('second baseline',name);});
 assert.equal(s.get(name).value,value);s.w.gw.updates['@2.'+name]();assert.deepEqual(s.updates,[['@2.'+name,value]]);
 assert.equal(s.w.webaNativeEditorStartup.starting,false);s.replace('normal later',name);assert.equal(s.get(name).value,'normal later');s.close();
}
{
 const s=scene(),full='full\0Ω😀';const marker=s.d.createElement('span');marker.className='weba-native-text';marker.dataset.field='@2.Description';marker.dataset.text=Buffer.from(JSON.stringify(full)).toString('base64');s.d.body.append(marker);
 s.answer(open,()=>s.replace('full�Ω😀'));assert.equal(s.get('Description').value,full);assert.equal(Object.keys(s.w.gw.updates).length,0);s.close();
}
for(const attr of ['readOnly','disabled']){
 const s=scene();s.get('Description')[attr]=true;s.type('forged');s.answer(open,()=>s.replace('server'));assert.equal(s.get('Description').value,'server');s.close();
}
{
 const s=scene();s.type('dirty');s.answer(open,()=>s.replace('readonly server','Description','readonly'));assert.equal(s.get('Description').value,'readonly server');s.close();
}
{
 const s=scene();s.type('old card');s.answer(route,()=>{s.d.getElementById('@2.OverviewRouteState').textContent='{"boardId":"4","cardId":"9"}';s.replace('different card');},['open',null]);assert.equal(s.get('Description').value,'different card');s.close();
}
{
 const s=scene();s.type('draft');s.answer(save,()=>s.replace('normalized server save'));assert.equal(s.get('Description').value,'normalized server save');s.close();
}
{
 const s=scene();s.type('early');s.answer(route,()=>s.replace('route baseline'),['open',null]);assert.equal(s.get('Description').value,'early');assert.equal(s.w.webaNativeEditorStartup.starting,true);
 s.answer(open,()=>s.replace('open baseline'),['pending update',null]);assert.equal(s.w.webaNativeEditorStartup.starting,true);
 s.answer(['update','@2.Description','text','early',true],()=>{});assert.equal(s.w.webaNativeEditorStartup.starting,false);s.close();
}
{
 const s=scene();s.type('early');const fn=s.w.gw.setOuterHtml;s.w.eval(source);assert.equal(s.w.gw.setOuterHtml,fn);s.answer(open,()=>s.replace('baseline'));assert.equal(s.get('Description').value,'early');s.close();
}
{
 const s=scene();s.type('early');s.get('Description').remove();s.answer(open,()=>s.replace('replacement'));assert.equal(s.get('Description').value,'replacement');s.close();
}
{
 const s=scene();s.type('early');s.answer(open,()=>s.w.gw.setOuterHtml('@2.Editor','<div id="@2.Editor" style="display:none"><div id="@2.Description"><input id="@2.Description:entry" value="hidden server"></div></div>'));assert.equal(s.get('Description').value,'hidden server');s.close();
}
for(const command of [['update','@2.EntryRouteAction','text','board|new|4|9',true],['update','@2.EntryRouteAction','text','board|new|8|3',true],['update','@2.EntryRouteAction','text','remaining|new',true],['update','@2.LoginLandingAction','text','open',true]]){
 const s=scene();s.type('old-card draft');s.answer(command,()=>s.replace('new navigation before acknowledgment'));assert.equal(s.get('Description').value,'new navigation before acknowledgment');s.close();
}
for(const attributes of ['hidden','style="display:none"','style="visibility:hidden"','class="gw-disabled"','aria-hidden="true"']){
 const s=scene(),container=s.d.createElement('section');container.innerHTML='<section '+attributes+'></section>';const parent=container.firstChild,editor=s.d.getElementById('@2.Editor');editor.replaceWith(parent);parent.append(editor);
 s.type('hidden forged input');s.answer(open,()=>s.replace('hidden ancestor server'));assert.equal(s.get('Description').value,'hidden ancestor server');s.close();
}
for(const name of ['Description','Labels']){
 const s=scene(),id='@2.'+name,control=s.w.gw[name==='Labels'?'textarea':'textbox'];s.type('first draft',name);
 s.answer(open,()=>control.setText(id,'stale initialization'),['deferred setter',null]);
 s.type("later\0Ω draft",name);s.answer(['update',id,'text','first draft',true],()=>s.flush());
 assert.equal(s.get(name).value,"later\0Ω draft");assert.equal(s.updates.at(-1)[1],"later\0Ω draft");s.close();
}
{
 const s=scene();s.type('queued save draft');s.w.gw.raise('@2.SaveCard','click',[],false);assert.equal(s.raised.length,0);
 s.answer(open,()=>{});assert.equal(s.raised.length,1);assert.equal(s.raised[0][0],'@2.SaveCard');s.close();
}
for(const invalid of ['context','disabled']){
 const s=scene();s.type('queued old draft');s.w.gw.raise('@2.SaveCard','click',[],false);
 if(invalid==='context')s.d.getElementById('@2.OverviewRouteState').textContent='{"boardId":"4","cardId":"9"}';else s.d.getElementById('@2.SaveCard').disabled=true;
 s.answer(open,()=>{});assert.equal(s.raised.length,0);s.close();
}
for(const invalid of ['readonly','context','replacement']){
 const s=scene();s.type('private draft');s.answer(open,()=>s.w.gw.textbox.setText('@2.Description','server'),['deferred setter',null]);
 if(invalid==='readonly')s.get('Description').readOnly=true;
 if(invalid==='context'){s.d.getElementById('@2.OverviewRouteState').textContent='{"boardId":"4","cardId":"9"}';s.get('Description').value='other card';}
 if(invalid==='replacement')s.get('Description').outerHTML='<input id="@2.Description:entry" value="replacement">';
 s.flush();assert.equal(s.get('Description').value,invalid==='readonly'?'server':invalid==='context'?'other card':'replacement');
 if(invalid!=='readonly')assert.equal(s.updates.length,0);s.close();
}
{
 const s=scene();s.type('early');s.answer(save,()=>s.w.gw.textbox.setText('@2.Description','normalized server'),['normal setter',null]);s.flush();assert.equal(s.get('Description').value,'normalized server');s.close();
}
{
 const s=scene();s.type('early');const command=s.w.gw.command;s.answer(open,()=>s.w.gw.textbox.setText('@2.Description','server'),['deferred setter',null]);
 const update=()=>{throw Error('wire failure');};s.w.gw.update=update;assert.throws(()=>s.flush(),/wire failure/);assert.equal(s.w.gw.update,update);assert.equal(s.w.gw.command,command);s.close();
}
{
 const s=scene();for(const id of [null,7,'@2.Other'])s.w.gw.raise(id,'click',[],false);assert.deepEqual(s.raised.map(x=>x[0]),[null,7,'@2.Other']);s.close();
}
console.log('Native editor startup: textbox/textarea full dirty text, repeated replacements, complete baselines, real update wire, readonly/disabled/hidden/detached/context refusal, normal Save, delayed native setters/latest input, queued Save/context cancellation, exception cleanup, pending-open completion and idempotent install passed');
