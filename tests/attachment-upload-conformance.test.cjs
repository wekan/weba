// Real HTTP results versus unchanged source target/write helper bodies.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'server/routes/attachmentApi.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Original attachment route required');
 const raw=fs.readFileSync(path.join(source,'server/routes/attachmentApi.js'),'utf8'),scopeRaw=fs.readFileSync(path.join(source,'server/lib/assignedOnlyAttachments.js'),'utf8'),caps=require(path.join(source,'models/lib/boardRoleCapabilities.js')),scope=require(path.join(source,'models/lib/boardCardScope.js'));
 const body=(text,start)=>{const at=text.indexOf(start),end=text.indexOf('\n}',at);assert.ok(at>=0&&end>at);return text.slice(at,end+2).replace(/^export /,'');};
 const listGateRaw=fs.readFileSync(path.join(source,'server/lib/listPermissionGate.js'),'utf8'),{exceptionFor}=require(path.join(source,'models/lib/listPermissions.js'));
 const functions=body(listGateRaw,'export async function listException(')+'\n'+body(scopeRaw,'export async function mayWriteInCardList(')+'\n'+body(raw,'async function userHasBoardWriteAccess(')+'\n'+body(scopeRaw,'export function mayWriteCardAttachment(')+'\n'+body(raw,'async function checkCardUploadTarget(');
 const seed=()=>JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}}));const f=seed(),foreign=seed();
 async function call(route,token,data){const response=await fetch(process.env.WEBA_TEST_URL+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});return{status:response.status,data:await response.json()};}
 const tokens={};for(const user of ['rest-member','rest-owner','rest-other']){const response=await call('/users/login',null,{username:user,password:process.env.WEBA_TEST_PASSWORD});assert.equal(response.status,200);tokens[user]=response.data.token;}
 const db=path.join(process.env.WEBA_DB_HOST,process.env.WEBA_DB_NAME);
 function prepare(role,assigned,blocked){execFileSync('python3',['-c',`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as d:
 b,c,role,assigned,blocked=sys.argv[2:]
 d.execute('DELETE FROM kb_members WHERE board_id=? AND username IN (?,?)',(b,'rest-member','rest-owner'))
 d.execute('DELETE FROM kb_member_flags WHERE board_id=?',(b,))
 if role not in ('global','owner','none'): d.execute('INSERT INTO kb_members (board_id,username,role) VALUES (?,?,?)',(b,'rest-member','board-admin' if role=='combined' else role))
 if role=='combined': d.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isReadAssignedOnly')",(b,'rest-member'))
 d.execute('UPDATE kb_cards SET assignee=? WHERE id=?',('rest-member' if assigned=='1' else '',c))
 d.execute("DELETE FROM kb_meta WHERE board_id=? AND setting='allowsAttachments'",(b,))
 if blocked=='1': d.execute("INSERT INTO kb_meta (board_id,kind,item_id,setting,value) VALUES (?,'board',?,'allowsAttachments','0')",(b,b))
`,db,String(f.boardId),String(f.cardId),role,assigned?'1':'0',blocked?'1':'0']);}
 let count=0;
 for(const role of ['global','owner','none','normal','board-admin','read-only','comment-only','worker','normal-assigned-only','combined'])for(const assigned of [false,true])for(const variant of ['valid','card','board','foreign','lane','list','blocked']){
  prepare(role,assigned,variant==='blocked');const user=role==='global'?'rest-owner':role==='owner'?'rest-other':'rest-member';
  const target={boardId:String(f.boardId),swimlaneId:String(f.swimlaneId),listId:String(f.listId),cardId:String(f.cardId)};
  if(variant==='card')target.cardId='999999';if(variant==='board')target.boardId='999999';if(variant==='foreign')target.boardId=String(foreign.boardId);if(variant==='lane')target.swimlaneId='999999';if(variant==='list')target.listId='999999';
  const flags=role==='combined'?{...caps.flagsForRole('board-admin'),isReadAssignedOnly:true}:caps.flagsForRole(['owner'].includes(role)?'board-admin':role),members=role==='none'||role==='global'?[]:[{userId:user,isActive:true,...flags}],board={_id:String(f.boardId),members,allowsAttachments:variant!=='blocked'},card={_id:String(f.cardId),boardId:board._id,swimlaneId:String(f.swimlaneId),listId:String(f.listId),assignees:assigned?['rest-member']:[]};
  // Native fixtures have no list roleExceptions; run the real source gate
  // against that explicit model instead of bypassing the newer list check.
  const listDocument={boardId:board._id},context={...scope,exceptionFor,Lists:{findOneAsync:async id=>id===card.listId?listDocument:null},allowIsBoardMemberWithWriteAccess:(id,b)=>caps.memberCan(b,id,'write'),ReactiveCache:{getCard:async id=>id===card._id?card:null,getBoard:async id=>id===board._id?board:id===String(foreign.boardId)?{_id:id,members:[],allowsAttachments:true}:null,getUser:async()=>role==='global'?{}:undefined},tripCanary:()=>{},require:id=>{if(id==='/server/lib/listPermissionGate')return {listException:context.listException};if(id==='/server/lib/securityLog')return {record:()=>{}};throw Error('Unexpected source dependency: '+id);}};
  const check=vm.runInNewContext(functions+'\ncheckCardUploadTarget',context);
  if(role==='normal'&&variant==='valid'){
   // Source-only negative: prove the adapter actually executes list refusal.
   // Native per-list exception persistence remains a separate TODO.
   listDocument.roleExceptions={normal:{write:false}};
   const refused=await check(target,user);assert.equal(refused.status,403);
   delete listDocument.roleExceptions;
  }
  const expected=await check(target,user),actual=await call('/api/attachment/upload',tokens[user],{...target,fileName:'source-matrix.bin',fileData:'eA=='}),label=JSON.stringify({role,assigned,variant});
  assert.equal(actual.status,expected.status||200,label);if(expected.status)assert.deepEqual(actual.data,{success:false,error:expected.message},label);else assert.equal(actual.data.success,true,label);count++;
 }
 console.log(`Attachment upload source conformance: ${count} real HTTP outcomes match unchanged checkCardUploadTarget/userHasBoardWriteAccess/mayWriteCardAttachment bodies plus actual mayWriteInCardList/listException and role/scope helpers; no-list-exception native fixtures, backend/ID adapters and no-op security-event logger explicit, full original upload/DDP/eventlog callback remains pending`);
})().catch(error=>{console.error(error);process.exitCode=1;});
