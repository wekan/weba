'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'client/lib/utils.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const policy=require(path.join(source,'models/lib/boardViewSettings.js')),utils=fs.readFileSync(path.join(source,'client/lib/utils.js'),'utf8'),users=fs.readFileSync(path.join(source,'models/users.js'),'utf8');
 function method(text,marker){const at=text.indexOf(marker),end=text.indexOf('\n  },',at);assert.ok(at>=0&&end>at);return text.slice(at+marker.length,end);}
 const read='(function(){'+method(utils,'  storedBoardView() {')+'\n})',write='(async function(view,boardId){'+method(users,'  async setBoardView(view, boardId) {')+'\n})';
 const fixture=(mode,id=0,value='',user='rest-pref-model-a')=>JSON.parse(execFileSync(process.env.GBX,['-s','ViewPreferenceFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_PREF_MODE:mode,WEBA_PREF_BOARD:String(id),WEBA_PREF_VALUE:value,WEBA_PREF_USER:user}}));
 assert.ok(!fixture('model-seed').error);let count=0;const profiles={};
 try{
  for(const actor of ['rest-pref-model-a','rest-pref-model-b']){
   const user=profiles[actor]={profile:{boardViews:{}}};
   const ctx={isKnownBoardView:policy.isKnownBoardView,DEFAULT_BOARD_VIEW:policy.DEFAULT_BOARD_VIEW,pendingBoardView:{get:()=>null,set(){}},currentUserWith:()=>user,Utils:{getCurrentBoardId:()=>String(ctx.board)},window:{localStorage:{getItem:()=>null}},assertSafeMapKey:key=>{assert.match(key,/^[1-9][0-9]*$/);},require:()=>policy,Meteor:{Error:class extends Error{}},Users:{updateAsync:async(id,update)=>{assert.equal(id,actor);for(const[key,value]of Object.entries(update.$set)){const parts=key.split('.');let target=user;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}}}};
   vm.createContext(ctx);const getter=vm.runInContext(read,ctx),setter=vm.runInContext(write,ctx);
   const cases=[[0,'board-view-table'],[12,'board-view-cal'],[13,'board-view-lists'],[0,'unknown-shared'],[12,'unknown-board'],...policy.BOARD_VIEWS.map(v=>[14,v.view])];
   for(const[board,value]of cases){let error=false;try{await setter.call({_id:actor},value,board?String(board):null);}catch{error=true;}const actual=fixture('save',board,value,actor);assert.equal(!!actual.error,error);for(const target of [0,12,13,14,15]){ctx.board=target||null;assert.equal(fixture('read',target,'',actor).stored,getter(),`${actor}/${board}/${value}/${target}`);count++;}}
  }
  console.log(`View preference source conformance: ${count} native own-user reads after writes match unchanged Users.setBoardView and Utils.storedBoardView bodies for every known view, per-board/shared precedence, invalid board/shared values and user isolation; SQL IDs/profile map and absent browser/pending/publication layers explicit adapters`);
 }finally{fixture('model-cleanup');}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
