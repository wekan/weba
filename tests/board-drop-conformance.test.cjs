// Compare native SQL outcomes with the original three board-drop callback bodies.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'client/components/boards/boardsList.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
if(!source)throw Error('Original board-list source unavailable');
const raw=fs.readFileSync(path.join(source,'client/components/boards/boardsList.js'),'utf8');
const functions=['isDragFromHome','isArchivedMultiBoardDrag','isDragFromRemaining','isDragFromWorkspace','isDragFromRemainingOrWorkspace'].map(name=>{const start=raw.indexOf('function '+name+'('),end=raw.indexOf('\n}',start);assert.ok(start>=0&&end>=0);return raw.slice(start,end+2);}).join('\n');
const constants=['DRAG_FROM_HOME','DRAG_FROM_REMAINING','DRAG_FROM_WORKSPACE','ARCHIVED_MULTI_BOARD_DRAG'].map(name=>{const match=raw.match(new RegExp('const '+name+" = '([^']+)';"));assert.ok(match,name+' constant');return 'const '+name+' = '+JSON.stringify(match[1])+';';}).join('\n');
function callback(signature,context){const start=raw.indexOf(signature),end=raw.indexOf('\n  },',start);assert.ok(start>=0&&end>=0,signature);return vm.runInNewContext(constants+'\n'+functions+'\n(function('+ (signature.includes('(evt, tpl)')?'evt,tpl':'evt') +'){'+raw.slice(start+signature.length,end)+'\n})',context);}
const cases=[];
for(const source of ['remaining','workspace','starred','archive'])for(const target of ['workspace','remaining','starred','archive']){
 if(target==='starred'&&!['remaining','workspace'].includes(source)||target==='archive'&&source==='archive')continue;
 for(const assigned of [false,true])for(const starred of [false,true])for(const flags of [{multi:false,mixed:false},{multi:true,mixed:false},{multi:true,mixed:true}])cases.push({source,target,assigned,starred,...flags});
}
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-board-drop-source.'));
try{
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});
 fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
 fs.copyFileSync(path.join(__dirname,'BoardDropMatrix.module'),path.join(work,'.src/BoardDropMatrix.module'));
 fs.writeFileSync(path.join(work,'.public/board-drop-cases.json'),JSON.stringify(cases));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
 const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardDropMatrix',work],{encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));
 assert.equal(actual.length,cases.length);
 for(const [index,row] of actual.entries()){
  const testCase=cases[index],state=JSON.parse(JSON.stringify(row.before)),ids=row.boardIds.map(String);
  const context={confirm:()=>true,TAPi18n:{__:key=>key},clearWorkspaceDropMarks(){},workspaceDropPositionOf:()=> 'inside',BoardMultiSelection:{reset(){}},Template:{instance:()=>({refreshArchivedBoardsCount(){}})},ReactiveCache:{getCurrentUser:()=>({hasStarred:id=>state[id].starred}),getBoard:id=>{assert.ok(ids.includes(id));return{archived:state[id].archived};}},Meteor:{call:(method,id,arg)=>{
   assert.ok(ids.includes(id));
   if(method==='toggleBoardStar')state[id].starred=!state[id].starred;
   else if(method==='archiveBoard')state[id].archived=true;
   else if(method==='restoreBoard')state[id].archived=false;
   else if(method==='assignBoardToWorkspace')state[id].assignment=arg;
   else if(method==='unassignBoardFromWorkspace')state[id].assignment='';
   else throw Error('Unexpected original method '+method);
  }}};
  // Explicit DOM/dataTransfer and Meteor-call adapters; callback code is unchanged.
  const evt={preventDefault(){},stopPropagation(){},currentTarget:{classList:{remove(){}},getAttribute:name=>name==='data-type'?testCase.target:name==='data-workspace-id'?row.spaceId:null},originalEvent:{dataTransfer:{types:[...(testCase.source==='remaining'?['application/x-board-from-remaining']:testCase.source==='workspace'?['application/x-board-from-workspace']:[]),...(testCase.multi&&testCase.source==='archive'?[raw.match(/const ARCHIVED_MULTI_BOARD_DRAG = '([^']+)';/)[1]]:[])],getData:type=>type==='text/plain'?(testCase.multi?JSON.stringify(ids):ids[0]):type==='application/x-board-multi'&&testCase.multi?'true':''}}};
  const signature=testCase.target==='workspace'?"  'drop .workspace-node'(evt, tpl) {":testCase.target==='archive'?"  'drop .js-open-archived-board'(evt) {":"  'drop .js-select-menu'(evt) {";
  callback(signature,context)(evt,{});
  assert.deepEqual(row.after,state,JSON.stringify(testCase));
 }
 console.log(`Board drop source conformance: ${cases.length} single/multi/mixed native SQL outcomes match unchanged original workspace/menu/archive callback bodies using explicit DOM/transport adapters; role/rollback checks are separate and native selection UI/full UI/Home remain pending`);
}finally{fs.rmSync(work,{recursive:true,force:true});}
