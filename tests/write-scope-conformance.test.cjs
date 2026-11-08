// All built-in raw flag combinations vs actual source role/scope functions.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 let source=process.env.WEKAN_SOURCE;
 if(!source){let ancestor=path.resolve(__dirname,'..');while(path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/boardCardScope.js'))){source=ancestor;break;}ancestor=path.dirname(ancestor);}}
 if(!source){console.log('SKIP original write-scope matrix: reference checkout unavailable; complete parity remains unverified');return;}
 const caps=require(path.join(path.resolve(source),'models/lib/boardRoleCapabilities.js'));
 const {isAssignedOnlyMember}=require(path.join(path.resolve(source),'models/lib/boardCardScope.js'));
 const flags=Object.values(caps.ROLE_FLAGS).filter(Boolean);
 assert.equal(flags.length,8,'audit additions to the source role flag set explicitly');
 const fixture=JSON.parse(process.env.WEBA_TEST_BOARDS),board=String(fixture.otherBoardId),card=String(fixture.otherCardId),list=String(fixture.otherListId);
 async function send(route,method,token,data){const response=await fetch(process.env.WEBA_TEST_URL+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});return{status:response.status,data:await response.json()};}
 async function login(username){const result=await send('/users/login','POST',null,{username,password:process.env.WEBA_TEST_PASSWORD});assert.equal(result.status,200);return result.data.token;}
 const admin=await login('rest-owner'),member=await login('rest-member');
 const route=`/api/boards/${board}/lists/${list}/cards/${card}`,roleRoute=`/api/boards/${board}/members/rest-member`;
 let retained=(await send(`/api/cards/${card}`,'GET',admin)).data.description;
 for(let mask=0;mask<2**flags.length;mask++){
  const raw=Object.fromEntries(flags.map((flag,index)=>[flag,!!(mask&(1<<index))]));
  const row={userId:'rest-member',isActive:true,...raw};
  const allowed=caps.roleCan(caps.memberRoleOf(row),'write')&&!isAssignedOnlyMember({members:[row]},row.userId);
  assert.equal((await send(roleRoute,'POST',admin,raw)).status,200);
  const result=await send(route,'PUT',member,{description:'Source flag mask '+mask});
  assert.equal(result.status,allowed?200:403,JSON.stringify({mask,raw,sourceRole:caps.memberRoleOf(row)}));
  if(allowed)retained='Source flag mask '+mask;
  else assert.deepEqual(result.data,{error:'Forbidden'});
  const actual=await send(`/api/cards/${card}`,'GET',admin);assert.equal(actual.status,200);
  assert.equal(actual.data.description,retained,'persisted description for source flag mask '+mask);
 }
 assert.equal((await send(roleRoute,'POST',admin,{role:'normal'})).status,200);
 console.log('REST write scope conformance: all 256 built-in raw flag combinations match actual source roleCan/memberRoleOf/isAssignedOnlyMember and persisted HTTP data; native scope has a separate 256-case check; custom roles/list exceptions/full suites remain pending');
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
