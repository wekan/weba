// Execute original spec 17 callbacks unchanged. Only their fixture backend is
// adapted; the remaining original tests are explicitly reported as unexecuted.
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
 if(!root){console.log('SKIP original spec 17: WeKan source unavailable; original suite parity remains unverified');return;}
 const spec=path.join(root,'tests/playwright/specs/17-rest-api.e2e.js');
 const playwright=createRequire(spec)('@playwright/test');
 const cases=[];
 const test=(title,...args)=>cases.push({title,callback:args.at(-1)});
 test.describe=(_title,callback)=>callback();
 const oracle=(operation,...args)=>execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'wekan-members-oracle.py'),operation,...args.map(String)],{encoding:'utf8'});
 const db={getBoard:id=>JSON.parse(oracle('get',id)),addBoardMember:({boardId,userId,isAdmin})=>oracle('add',boardId,userId,isAdmin),
  find:(collection,query)=>{if(collection!=='cards'||query.archived!==false)throw Error('Unsupported card query');return JSON.parse(oracle('cards',query.boardId,query.listId));},
  getCard:id=>JSON.parse(oracle('card',id)),
 };
 vm.runInNewContext(fs.readFileSync(spec,'utf8'),{require:name=>{
  if(name==='../fixtures')return{test,expect:playwright.expect};
  if(name==='../helpers/db')return db;
  throw Error('Unsupported original spec dependency '+name);
 }},{filename:spec});
 const selected=cases.filter(({title})=>title.startsWith('#5998 add board member ')||title.startsWith('#5998 adding a board member ')||title.startsWith('#5998 add card member:')||title.startsWith('#3697 clearing members via REST')||title.startsWith('#5846 set then clear'));
 playwright.expect(selected.length).toBe(6);
 const request=await playwright.request.newContext({baseURL:process.env.WEBA_TEST_URL});
 try{
  const login=async username=>{
   const response=await request.post('/users/login',{data:{username,password:process.env.WEBA_TEST_PASSWORD}});
   playwright.expect(response.status()).toBe(200);
   const data=await response.json();secrets.push(data.token);return{id:data.id,token:data.token};
  };
  const admin=await login('rest-owner');
  const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS);
  const boardId=String(fixture.otherBoardId);
  const post=async(route,data)=>{
   const response=await request.post('/api/boards/'+boardId+'/members/'+route,{headers:{Authorization:'Bearer '+admin.token},data});
   playwright.expect(response.status()).toBe(200);
  };
  for(const {title,callback} of selected){
   // Same per-test member graph as the original fixture: owner/admin + user2.
   oracle('reset-board',boardId);
   oracle('reset-card-people',boardId,fixture.otherCardId);
   await post('rest-other/add',{action:'add',role:'admin'});
   await post('rest-other',{role:'admin'});
   await post('rest-member/remove',{action:'remove'});
   oracle('reset',boardId,'rest-member');
   const user=await login('rest-other'),user2=await login('rest-member');
   await callback({request,user,user2,board:{boardId,listIds:[String(fixture.otherListId)]}});
   console.log('Original spec 17 passed: '+title);
  }
  oracle('reset-card-people',boardId,fixture.otherCardId);
  console.log(`Original spec 17: ${selected.length} unchanged membership callbacks passed; ${cases.length-selected.length} other callbacks not executed`);
 }finally{await request.dispose();}
})().catch(error=>{
 let message=error.stack||String(error);
 for(const secret of secrets)if(secret)message=message.split(secret).join('[redacted]');
 console.error(message);process.exitCode=1;
});
