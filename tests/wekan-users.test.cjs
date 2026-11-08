// Original spec 17 user-deletion callback and assertions, unmodified.
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
   if(fs.existsSync(path.join(ancestor,'tests/playwright/specs/17-rest-api.e2e.js'))){root=ancestor;break;}
   ancestor=path.dirname(ancestor);
  }
 }
 if(!root){console.log('SKIP original user deletion: WeKan source unavailable; original suite parity remains unverified');return;}
 const spec=path.join(root,'tests/playwright/specs/17-rest-api.e2e.js');
 const playwright=createRequire(spec)('@playwright/test');
 const cases=[];
 const test=(title,...args)=>cases.push({title,callback:args.at(-1)});
 test.describe=(_title,callback)=>callback();
 const oracle=(operation,...args)=>execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'wekan-users-oracle.py'),operation,...args],{encoding:'utf8'});
 const db={
  seedUser:()=>JSON.parse(oracle('seed')),
  findOne:(collection,query)=>{if(collection!=='users')throw Error('Unsupported collection');return JSON.parse(oracle('get',query._id));},
  deleteOne:(collection,query)=>{if(collection!=='users')throw Error('Unsupported collection');oracle('cleanup',query._id);},
 };
 vm.runInNewContext(fs.readFileSync(spec,'utf8'),{require:name=>{
  if(name==='../fixtures')return{test,expect:playwright.expect};
  if(name==='../helpers/db')return db;
  throw Error('Unsupported original spec dependency '+name);
 }},{filename:spec});
 const selected=cases.filter(({title})=>title==='user deletion confirms removal and reports a repeat as 404');
 playwright.expect(selected.length).toBe(1);
 const request=await playwright.request.newContext({baseURL:process.env.WEBA_TEST_URL});
 try{
  const response=await request.post('/users/login',{data:{username:'rest-owner',password:process.env.WEBA_TEST_PASSWORD}});
  playwright.expect(response.status()).toBe(200);
  const data=await response.json();secrets.push(data.token);
  for(const {title,callback} of selected){
   await callback({request,adminUser:{id:data.id,token:data.token}});
   console.log('Original spec 17 passed: '+title);
  }
  console.log(`Original user-deletion adapter: 1 unchanged callback passed; ${cases.length-1} other callbacks not executed here`);
 }finally{await request.dispose();}
})().catch(error=>{
 let message=error.stack||String(error);
 for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');
 console.error(message);process.exitCode=1;
});
