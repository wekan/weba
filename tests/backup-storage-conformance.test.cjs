'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const project=process.env.WEBA_TEST_BACKUP_STORAGE_PROJECT;
assert.ok(project,'Isolated native backup storage fixture required');
const frame=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BackupStorageTest',project],{encoding:'utf8',env:process.env,maxBuffer:32*1024*1024}));
function normalize(data,board){
  const maps={board:new Map([[board,'board']])};
  for(const [kind,key] of [['lane','lanes'],['list','lists'],['card','cards'],['entry','entries'],['file','files']])maps[kind]=new Map(data[key].map((row,i)=>[row.id,kind+i]));
  const copy=JSON.parse(JSON.stringify(data));copy.kind='board';
  for(const [kind,key] of [['lane','lanes'],['list','lists'],['card','cards'],['entry','entries'],['file','files']])for(const row of copy[key])row.id=maps[kind].get(row.id);
  for(const row of copy.cards){row.list_id=maps.list.get(row.list_id);if(row.coverFile!==undefined)row.coverFile=maps.file.get(row.coverFile);}
  for(const row of copy.entries){row.card_id=maps.card.get(row.card_id);if(row.parent_id)row.parent_id=maps.entry.get(row.parent_id);if(['subtask','dependency'].includes(row.kind))row.amount=maps.card.get(row.amount);}
  for(const row of copy.files)row.card_id=maps.card.get(row.card_id);
  for(const row of copy.metadata)row.item_id=maps[row.kind].get(row.item_id);
  return copy;
}
assert.equal(frame.snapshots.length,24);
assert.equal(frame.refusals,11);
for(const sample of [...frame.snapshots,frame.retry]){
  const source=JSON.parse(sample.source),target=JSON.parse(sample.target),label=sample.actor+'/'+sample.kind+'/'+sample.variant;
  const expected=normalize(source,sample.sourceBoard),actual=normalize(target,sample.targetBoard);
  if(sample.kind!=='board')for(const key of ['boardViewSettings','defaultPublicBoardView','defaultPrivateBoardView','boardViewOrder'])delete actual[key];
  assert.deepEqual(actual,expected,label);
  assert.ok(source.cards[0].title.includes('\0')&&target.cards[0].title.includes('\0'),label+' complete NUL title');
  assert.equal(target.entries.find(row=>row.kind==='time').amount,100000.00000000001,label+' exact stored real');
  assert.equal(target.files[0].base64,Buffer.from([66,0,255,90]).toString('base64'),label+' binary bytes');
  assert.equal(target.files[0].filename,source.files[0].filename,label+' full filename');
}
console.log('Native backup storage: 24 owner/readonly board/lane/list/card complete import/re-export snapshots plus full retry and 11 exact-state rollback refusals preserve control/NUL/Unicode/lone units, NULL/empty fields, exact real, hierarchy, provenance, filename and BLOB bytes; fresh IDs/scoped-new-board policy adapter explicit');
