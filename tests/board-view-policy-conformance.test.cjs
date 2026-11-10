'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/boardViewSettings.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
const original=require(path.join(source,'models/lib/boardViewSettings.js')),metadata=require('../WeKan/.public/board-views.json'),root=path.resolve(__dirname,'..'),cases=[{doc:{}},{doc:{defaultPublicBoardView:'bad',boardViewSettings:{'board-view-table':{showOnPublic:'false',showOnPrivate:false}}}},{doc:{boardViewOrder:['bad',null,'board-view-table','board-view-table']}}];
assert.deepEqual(metadata.views,original.BOARD_VIEWS);assert.deepEqual(metadata.order,original.DEFAULT_BOARD_VIEW_ORDER);
cases.push({doc:{boardViewOrder:metadata.order.filter(v=>!metadata.later.includes(v))}});
for(const item of metadata.views)for(const side of ['Public','Private']){
 cases.push({doc:{},input:{['default'+side+'BoardView']:item.view}});
 cases.push({doc:{},input:{boardViewSettings:{[item.view]:{['showOn'+side]:false}}}});
}
for(const raw of [true,false,'TRUE','false',' true ',[],[true],[['TRUE']],{},null,1])cases.push({doc:{},input:{boardViewSettings:{'board-view-table':{showOnPublic:raw}}}});
for(const input of [{},{unknown:true},{boardViewSettings:{}},{boardViewSettings:{'bad':{}}},{boardViewSettings:{'board-view-table':null}},{boardViewSettings:null},{defaultPrivateBoardView:23},{boardViewOrder:['bad']},{boardViewOrder:[null]},{boardViewOrder:'board-view-table'},{boardViewOrder:[]},{boardViewOrder:['board-view-table','board-view-table','board-view-cal']},{defaultPublicBoardView:'board-view-table',boardViewSettings:{'board-view-swimlanes':{showOnPublic:false}}}])cases.push({doc:{},input});
const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-view-conformance.'));
try{
 fs.cpSync(path.join(root,'WeKan/.src'),path.join(work,'.src'),{recursive:true});fs.cpSync(path.join(root,'WeKan/.public'),path.join(work,'.public'),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'BoardViewPolicyConformance.module'),path.join(work,'.src/BoardViewPolicyConformance.module'));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work]);
 let count=0;
 for(let start=0;start<cases.length;start+=20){const batch=cases.slice(start,start+20),native=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardViewPolicyConformance',work],{encoding:'utf8',env:{...process.env,WEBA_VIEW_CASES:JSON.stringify(batch)}}));
  batch.forEach((row,i)=>{let doc=structuredClone(row.doc),error=false;if('input'in row){const result=original.boardViewSettingsRequest(doc,row.input);if(result.error||!Object.keys(result.$set).length)error=true;else for(const[key,value]of Object.entries(result.$set)){const parts=key.split('.');let target=doc;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}}
   assert.deepEqual(native[i],error?{error:true}:{snapshot:original.boardViewSettingsSnapshot(doc)},JSON.stringify(row));count++;});
 }
 console.log(`Board view policy source conformance: ${count} native snapshots/request results match unchanged source helpers for every view/side, missing/corrupt defaults, older/default/custom order, duplicate/unknown keys, default-before-hide and source boolean coercion; native storage/renderer availability remain explicit adapters`);
}finally{fs.rmSync(work,{recursive:true,force:true});}
