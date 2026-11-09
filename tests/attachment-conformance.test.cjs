// Actual native SQL states compared with unchanged attachment lifecycle plans.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/attachmentSoftDelete.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
assert.ok(source,'Original attachment helper source required');const plans=require(path.join(source,'models/lib/attachmentSoftDelete.js'));
const cases=[];for(const deleted of [false,true])for(const cover of ['none','target','other'])for(const operation of ['delete','restore'])cases.push({deleted,cover,operation});
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-attachment-source.'));
try{
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'AttachmentMatrix.module'),path.join(work,'.src/AttachmentMatrix.module'));fs.writeFileSync(path.join(work,'.public/attachment-cases.json'),JSON.stringify(cases));execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
 const rows=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','AttachmentMatrix',work],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db'}}));assert.equal(rows.length,cases.length);
 for(const [i,row] of rows.entries()){
  const c=cases[i],a={_id:String(row.fileId),name:'literal <name>.bin',meta:{boardId:String(row.boardId),cardId:String(row.cardId)}};if(row.before.deletedAt)Object.assign(a,{deletedAt:new Date(row.before.deletedAt),deletedBy:row.before.deletedBy,deleteBatchId:row.before.deleteBatchId});
  const expected=structuredClone(row.before),actor='attachment-matrix';let plan,changed;
  if(c.operation==='delete'){
   plan=plans.softDeleteAttachmentPlan({attachment:a,card:{coverId:row.before.cover},userId:actor,at:new Date(row.after.deletedAt||1),batchId:row.after.deleteBatchId});changed=!plan.alreadyDeleted;
   if(changed){expected.deletedAt=plan.set.deletedAt.getTime();expected.deletedBy=plan.set.deletedBy;expected.deleteBatchId=plan.set.deleteBatchId;if(plan.unsetCover)expected.cover='';}
  }else{plan=plans.restoreAttachmentPlan({attachment:a,userId:actor});changed=!plan.alreadyLive;if(changed)for(const key of Object.keys(plan.modifier.$unset))delete expected[key];assert.equal(plan.resetCover,false);}
  if(changed)expected.history.push({action:plan.historyRow.changeType,actor:plan.historyRow.userId,batch:plan.historyRow.batchId,filename:a.name,previousAt:c.operation==='restore'?row.before.deletedAt:0});
  assert.deepEqual(row.after,expected,JSON.stringify(c));
  assert.equal(plans.historyRowOffersRestore({entityType:'attachment'},{...a,deletedAt:row.after.deletedAt?new Date(row.after.deletedAt):null}),!!row.after.deletedAt);
 }
 console.log(`Attachment source conformance: ${cases.length} native SQL outcomes match unchanged lifecycle plans for live/deleted states, target/other/no cover, idempotency, retained bytes and lifecycle history metadata; time/ID adapters explicit, full source history/undo remains pending`);
}finally{fs.rmSync(work,{recursive:true,force:true});}
