// Run the original archive HTTP callbacks unchanged with explicit SQLite fixtures.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let root=process.env.WEKAN_SOURCE&&path.resolve(process.env.WEKAN_SOURCE);
 if(!root){
  let ancestor=path.resolve(__dirname,'..');
  while(path.dirname(ancestor)!==ancestor){
   if(fs.existsSync(path.join(ancestor,'tests/playwright/specs/rest-card-archive.e2e.js'))){root=ancestor;break;}
   ancestor=path.dirname(ancestor);
  }
 }
 if(!root){console.log('SKIP original archive spec: source unavailable; parity remains unverified');return;}
 const spec=path.join(root,'tests/playwright/specs/rest-card-archive.e2e.js');
 const playwright=createRequire(spec)('@playwright/test');
 const cases=[];
 const test=(title,callback)=>cases.push({title,callback});
 const oracle=(operation,...args)=>JSON.parse(execFileSync(process.env.PYTHON||'python3',[
  path.join(__dirname,'wekan-archive-oracle.py'),operation,...args.map(value=>JSON.stringify(value))],{encoding:'utf8'}));
 const db={findOne:(...args)=>oracle('find-one',...args),find:(...args)=>oracle('find',...args),
  seedBoard:options=>oracle('seed',options),updateOne:(...args)=>oracle('update',...args),
  cleanup:options=>oracle('cleanup',options),uid:prefix=>prefix+'-nonexistent-card'};
 vm.runInNewContext(fs.readFileSync(spec,'utf8'),{require:name=>{
  if(name==='../fixtures')return{test,expect:playwright.expect};
  if(name==='../helpers/db')return db;
  throw Error('Unsupported dependency '+name);
 }},{filename:spec});
 const selected=cases.filter(({title})=>title.endsWith('returns JSON 404 for missing, incorrectly scoped and wrong-state cards without writes'));
 playwright.expect(cases.length).toBe(3);playwright.expect(selected.length).toBe(2);
 const request=await playwright.request.newContext({baseURL:process.env.WEBA_TEST_URL});
 let saved;
 try{
  const response=await request.post('/users/login',{data:{username:'rest-other',password:process.env.WEBA_TEST_PASSWORD}});
  playwright.expect(response.status()).toBe(200);
  const user=await response.json();secrets.push(user.token);
  saved=oracle('prepare');
  for(const {title,callback} of selected){
   await callback({request,user,board:{boardId:saved.boardId,listIds:saved.listIds}});
   console.log('Original archive spec passed: '+title);
  }
  console.log('Original archive spec: 2/3 unchanged callbacks passed; live board UI callback remains unexecuted');
 }finally{if(saved)oracle('restore',saved);await request.dispose();}
})().catch(error=>{
 let message=error.stack||String(error);
 for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');
 console.error(message);process.exitCode=1;
});
