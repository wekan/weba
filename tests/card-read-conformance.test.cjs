// Actual GET contents vs the unchanged original serializer and independent SQL.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE;
 if(!source){let ancestor=path.resolve(__dirname,'..');while(path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'server/lib/checklistDeadlines.js'))){source=ancestor;break;}ancestor=path.dirname(ancestor);}}
 if(!source){console.log('SKIP original card/checklist serializer: reference checkout unavailable; complete parity remains unverified');return;}
 const {cardWithChecklists}=require(path.join(path.resolve(source),'server/lib/checklistDeadlines.js'));
 const input=JSON.parse(execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'card-read-oracle.py')],{encoding:'utf8'}));
 const cache={getChecklists:async query=>input.checklists.filter(row=>row.cardId===query.cardId).sort((a,b)=>a.sort-b.sort),
  getChecklistItems:async query=>input.items.filter(row=>row.checklistId===query.checklistId&&row.cardId===query.cardId).sort((a,b)=>a.sort-b.sort)};
 const original=JSON.stringify(input);
 const expected=await cardWithChecklists(input.card,cache);
 assert.equal(JSON.stringify(input),original,'original helper does not mutate its inputs');
 const login=await fetch(process.env.WEBA_TEST_URL+'/users/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'rest-other',password:process.env.WEBA_TEST_PASSWORD})});assert.equal(login.status,200);
 const {token}=await login.json();
 for(const route of [`/api/cards/${input.card._id}`,`/api/boards/${input.card.boardId}/lists/${input.card.listId}/cards/${input.card._id}`]){
  const response=await fetch(process.env.WEBA_TEST_URL+route,{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);
  assert.deepEqual(await response.json(),expected);
 }
 console.log('Single-card conformance: both actual GETs match the original cardWithChecklists serializer for implemented fields on independent SQL inputs; full schema/deadline parity remains pending');
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
