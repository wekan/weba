// Execute the unchanged source collector's archive selection, then verify every
// implemented external-tool format against actual SQLite service snapshots.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/externalExporters.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Parent external collector required');
 const raw=fs.readFileSync(path.join(source,'models/lib/externalExporters.js'),'utf8'),body=start=>{const at=raw.indexOf(start),end=raw.indexOf('\n}',at);assert.ok(at>=0&&end>at);return raw.slice(at,end+2);};
 const docs=[{_id:'active',boardId:'board',title:'Active export canary',description:'ACTIVE_EXPORT_BODY',archived:false},{_id:'archived',boardId:'board',title:'Hidden archived canary',description:'SECRET_ARCHIVED_BODY_CANARY',archived:true}];let selected=false,anonymized=false;
 const context={ReactiveCache:{getBoard:async()=>({_id:'board',labels:[]}),getLists:async()=>[],getSwimlanes:async()=>[],getCards:async selector=>{assert.equal(selector.archived,false);assert.equal(selector.boardId,'board');selected=true;return docs.filter(doc=>doc.boardId===selector.boardId&&doc.archived===selector.archived);}},SCRUM_FORMATS:new Set(),WRIKE_FORMATS:new Set(),buildCustomFieldsWD:(values,defs)=>{assert.equal(defs.length,0);return[];},iso:value=>value,require:name=>{assert.equal(name,'./importExportSecurity');return{anonymizeExportIdentities:async args=>{assert.equal(args.boardId,'board');anonymized=true;}};}};
 const collected=await vm.runInNewContext(body('function gateItem(')+'\n'+body('async function collect(')+'\ncollect',context)('board',['description'],'kanboard');assert.ok(selected&&anonymized);assert.deepEqual(Array.from(collected.items,item=>item.title),['Active export canary']);
 for(const title of ['Todo','','Doing']){
   const outputs=[];
   for(const physical of [true,false]){
     const rows=[{_id:'other',title,archived:false},...(physical?[{_id:'deleted',title:'Todo',archived:false,deleted:true}]:[])];
     const cache={...context.ReactiveCache,getLists:async selector=>{assert.equal(selector.archived,false);return rows.filter(row=>row.archived===false&&!row.deleted);},getCards:async()=>[{_id:'active',title:'Active export canary',listId:'deleted',archived:false},{_id:'orphan',title:'Active orphan canary',archived:false}]};
     const output=await vm.runInNewContext(body('function gateItem(')+'\n'+body('async function collect(')+'\ncollect',{...context,ReactiveCache:cache})('board',['description'],'kanboard');
     assert.deepEqual(Array.from(output.items,item=>item.listTitle),['','']);assert.equal(output.items[0].listId,'deleted');outputs.push(JSON.parse(JSON.stringify(output)));
   }
   assert.deepEqual(outputs[0],outputs[1]);
 }
 const data=JSON.parse(execFileSync(process.env.GBX,['-s','ExternalArchiveExportTest',process.env.WEBA_TEST_EXTERNAL_ARCHIVE_PROJECT],{encoding:'utf8',env:process.env}));
 const queue=fs.readFileSync(path.join(__dirname,'../WeKan/.src/BoardBatchExport.module'),'utf8'),accepted=[...queue.matchAll(/format <> "([^"]+)"/g)].map(match=>match[1]).filter(name=>!['weba','csv','scsv','tsv','excel'].includes(name));assert.deepEqual([...data.formats].sort(),accepted.sort(),'Each implemented external-tool format must participate in this content regression');
 const failures=[];for(const snapshot of data.snapshots){const label=`${snapshot.actor}/${snapshot.format}`;if(snapshot.format==='wrikeworkflow'){const metadata=JSON.parse(snapshot.content);assert.deepEqual(Object.keys(metadata).sort(),['board','format','lists']);assert.equal(metadata.board.title,'Archive export contract');assert.ok(metadata.lists.some(list=>list.title==='Todo'));}else if(!snapshot.content.includes('Active export canary'))failures.push(label+' lost active card');for(const canary of ['Hidden archived canary','SECRET_ARCHIVED_BODY_CANARY','ARCHIVED_TAG_MARKER','ARCHIVED_COMMENT_MARKER'])if(snapshot.content.includes(canary))failures.push(label+' leaked '+canary);}
 assert.deepEqual(failures,[]);assert.equal(data.snapshots.length,data.formats.length*2);
 const listFailures=[];for(const snapshot of data.listSnapshots){if(snapshot.present!==snapshot.removed)listFailures.push(`${snapshot.actor}/${snapshot.mode}/${snapshot.format}`);}assert.deepEqual(listFailures,[],'Tombstoned physical list rows must not change exports relative to the same dangling list IDs');assert.equal(data.listSnapshots.length,data.formats.length*6);
 console.log(`External live-list scope: ${data.listSnapshots.length} owner/readonly, duplicate/blank/missing-title complete descriptor pairs across all ${data.formats.length} formats match unchanged source live-list lookup; fixture-only fixed export clock, SQL IDs and neutral cache adapters explicit`);
 console.log(`External archive scope: ${data.snapshots.length} actual owner/readonly exports across all ${data.formats.length} implemented tool formats match unchanged source active-card collection; archived title/body/tag/comment excluded (workflow metadata intentionally has no cards), retained cards/entries/history and native/generic CSV/Excel archive behavior preserved. Explicit neutral cache/disabled-field/no-op anonymization adapters; full auth/eventlog integration remains separate`);
})().catch(error=>{console.error(error);process.exitCode=1;});
