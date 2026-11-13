'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const project=process.env.WEBA_TEST_BACKUP_TEXT_PROJECT;
assert.ok(project,'Isolated native backup fixture required');
const frame=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BackupTextTest',project],{encoding:'utf8',env:process.env,maxBuffer:16*1024*1024}));
const value=name=>name+String.fromCharCode(0)+" Ω😀'"+String.fromCharCode(92,8,12,10)+"SUFFIX";
assert.equal(frame.snapshots.length,32);
for(const snapshot of frame.snapshots){
  const data=JSON.parse(snapshot.content),variant=snapshot.variant;
  const label=`${snapshot.actor}/${snapshot.mode}/${variant}`;
  assert.equal(data.title,value(snapshot.mode),label+' context title');
  assert.equal(data.cards.length,1,label+' scoped card');assert.equal(data.lanes.length,1,label+' lane');
  assert.equal(data.lists.length,snapshot.mode==='board'||snapshot.mode==='lane'?3:1,label+' ordered lists');
  const card=data.cards[0],entry=data.entries[0],file=data.files[0];
  assert.equal(card.title,value('card'),label);assert.equal(card.labels,value('labels'),label);
  assert.equal(card.description,variant==='null'?null:variant==='empty'?'':value('description'),label+' nullable description');
  assert.equal(card.lane,value('lane'),label);assert.equal(card.status,value('list'),label);assert.equal(card.list_id,frame.listId,label+' stable source list ID');
  assert.equal(data.lanes[0].title,value('lane'),label);assert.equal(data.lanes[0].sort_order,41,label+' NUL lane order key');
  for(const list of data.lists){assert.equal(list.lane,value('lane'),label);if(list.id===frame.listId)assert.equal(list.title,value('list'),label);}
  assert.equal(entry.title,value('custom-title'),label);assert.equal(entry.body,variant==='null'?null:variant==='empty'?'':value('custom-body'),label+' nullable custom body');assert.equal(entry.author_name,value('author'),label);
  assert.equal(file.filename,value('filename'),label);assert.equal(file.mime,value('mime'),label);assert.equal(file.author_name,value('author'),label);assert.equal(file.base64,Buffer.from('A\0B').toString('base64'),label);
  assert.equal(data.metadata[0].value,value('metadata'),label);
}
console.log('Native backup wire text: 32 owner/readonly board/lane/list/card snapshots preserve complete control/NUL/Unicode text, NULL versus empty, missing-link grouping, display authors and exact attachment bytes; standard JSON decoder used, native import decoder/storage parity remains separate');
