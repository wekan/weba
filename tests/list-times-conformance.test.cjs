// Compare actual HTTP results against the actual source reducer and SQL inputs.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE;
 if(!source){let ancestor=path.resolve(__dirname,'..');while(path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/listActivityDates.js'))){source=ancestor;break;}ancestor=path.dirname(ancestor);}}
 if(!source){console.log('SKIP original list reducer: reference checkout unavailable; source parity remains unverified');return;}
 const {newestCardChangeByList}=require(path.join(path.resolve(source),'models/lib/listActivityDates.js'));
 const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS);
 const input=JSON.parse(execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'list-times-oracle.py')],{encoding:'utf8'}));
 const expected=newestCardChangeByList(input.cards);
 const login=await fetch(process.env.WEBA_TEST_URL+'/users/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'rest-other',password:process.env.WEBA_TEST_PASSWORD})});assert.equal(login.status,200);
 const {token}=await login.json();
 const response=await fetch(process.env.WEBA_TEST_URL+`/api/boards/${fixture.otherBoardId}/lists`,{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);
 const rows=await response.json();
 for(const row of rows){const stored=input.lists.find(list=>list._id===row._id);assert.ok(stored);assert.equal(row.modifiedAt,stored.modifiedAt===null?null:new Date(stored.modifiedAt).toISOString());assert.equal(row.cardsModifiedAt,expected.get(row._id)?.toISOString()??null);}
 console.log('List times conformance: actual HTTP UTC/null values match the unchanged original reducer on independent SQL inputs, including archived/untimed cards');
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
