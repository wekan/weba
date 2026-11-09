// Gate/selection outcomes from actual SQL versus the unchanged original method.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'server/models/boards.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original purge source unavailable');
 const raw=fs.readFileSync(path.join(source,'server/models/boards.js'),'utf8'),signature='  async permanentlyDeleteArchivedBoards(boardIds) {';
 const start=raw.indexOf(signature),end=raw.indexOf('\n  },',start);assert.ok(start>=0&&end>start,'unchanged original purge body exists');const body=raw.slice(start+signature.length,end);
 const cases=[];for(const actor of ['global','owner','anonymous'])for(const enabled of [false,true])for(const selection of ['archived','duplicate','active','mixed','missing','zero','empty','null','overlimit'])cases.push({actor,enabled,selection});cases.push({actor:'global',enabled:true,selection:'maximum'});
 const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-purge-source.'));
 try{
  for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'BoardPurgeMatrix.module'),path.join(work,'.src/BoardPurgeMatrix.module'));fs.writeFileSync(path.join(work,'.public/purge-cases.json'),JSON.stringify(cases));
  execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
  const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardPurgeMatrix',work],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));assert.equal(actual.length,cases.length);
  for(const [index,row] of actual.entries()){
   const initial=row.before.map(board=>({_id:String(board.id),title:board.title,archived:board.archived})),remaining=structuredClone(initial),audits=[];
   const user=row.signedIn?{_id:'actor',username:'matrix-'+cases[index].actor,isAdmin:row.admin}:null;
   const context={check(ids){if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))throw Error('invalid shape');},ReactiveCache:{getUser:async()=>user},getFeatureFlags:()=>({enablePermanentDelete:row.enabled}),RecoveryEvents:{types:{BOARD_PERMANENTLY_DELETED:'board-permanently-deleted'}},recordRecoveryAudit:async event=>audits.push(event),Meteor:{Error:class extends Error{constructor(code,reason){super(reason||code);this.reason=reason||code;}}},Boards:{find:selector=>({fetchAsync:async()=>remaining.filter(board=>selector._id.$in.includes(board._id))}),removeAsync:async id=>remaining.splice(remaining.findIndex(board=>board._id===id),1)}};
   const method=vm.runInNewContext('(async function(boardIds){'+body+'\n})',context),ids=row.ids===null?null:row.ids.map(String);let ok=true,deleted=0;
   try{deleted=(await method.call({userId:user?user._id:null,connection:{id:'fixture'}},ids)).deleted;}catch{ok=false;}
   assert.equal(row.ok,ok,JSON.stringify(cases[index]));assert.equal(row.deleted,deleted,JSON.stringify(cases[index]));assert.deepEqual(row.after.map(board=>String(board.id)),remaining.map(board=>board._id),JSON.stringify(cases[index]));
   assert.deepEqual(row.audits.map(audit=>[audit.done,audit.deletedData]),audits.map(audit=>[audit.done,audit.deletedData===true]),'audit outcomes '+JSON.stringify(cases[index]));
   if(ok){const nativeBoards=row.audits.flatMap(event=>event.boards.map(board=>[String(board.id),board.title])),sourceBoards=audits.flatMap(event=>event.boards.map(board=>[board._id,board.title]));assert.deepEqual(nativeBoards,sourceBoards,'successful audit identities/titles');}
  }
  console.log(`Purge source conformance: ${cases.length} actual native SQL outcomes match the unchanged original permanentlyDeleteArchivedBoards body for actor/flag, bounded/deduplicated archive selection and success/failure audits, including 200 boards; atomic failure and UI coverage are separate native tests`);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
