// Actual HTTP routes versus unchanged source routes and Authentication object.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'server/authentication.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const fixture=mode=>JSON.parse(execFileSync(process.env.GBX,['-s','PublicBoardFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_PUBLIC_MODE:mode,WEBA_PUBLIC_ID:'0'}})),id=fixture('view-api-seed').boardId,db=path.join(process.env.WEBA_DB_HOST,process.env.WEBA_DB_NAME),url=process.env.WEBA_TEST_URL+'/api/boards/'+id+'/boardViewSettings';
 const policy=require(path.join(source,'models/lib/boardViewSettings.js')),authRaw=fs.readFileSync(path.join(source,'server/authentication.js'),'utf8'),routes=fs.readFileSync(path.join(source,'server/models/boards.js'),'utf8');
 const at=authRaw.indexOf('export const Authentication = '),end=authRaw.indexOf('\n};',at);assert.ok(at>=0&&end>at);const authCode=authRaw.slice(at,end+3).replace('export const','const');
 const route={};for(const method of ['get','put']){const marker=`WebApp.handlers.${method}('/api/boards/:boardId/boardViewSettings', async function(req, res) {`,start=routes.indexOf(marker),stop=routes.indexOf('\n});',start);assert.ok(start>=0&&stop>start);route[method]='(async function(req,res){'+routes.slice(start+marker.length,stop)+'\n})';}
 async function call(method,token,body){const r=await fetch(url,{method:method.toUpperCase(),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{code:r.status,data:await r.json()};}
 const tokens={};for(const actor of ['rest-member','rest-other','rest-owner']){const r=await fetch(process.env.WEBA_TEST_URL+'/users/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:actor,password:process.env.WEBA_TEST_PASSWORD})});tokens[actor]=(await r.json()).token;assert.ok(tokens[actor]);}
 const sql=`import sqlite3,json,sys
with sqlite3.connect(sys.argv[1]) as d:
 b,flags,active,member=sys.argv[2:];flags=json.loads(flags)
 for t in ['kb_members','kb_member_flags','kb_removed_members']:d.execute("DELETE FROM "+t+" WHERE board_id=? AND username='rest-member'",(b,))
 if member=='1':d.execute("INSERT INTO kb_members (board_id,username,role) VALUES (?,'rest-member','normal')",(b,))
 for f in flags:d.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,'rest-member',?)",(b,f))
 if active=='0':d.execute("INSERT INTO kb_removed_members (board_id,username,role) VALUES (?,'rest-member','normal')",(b,))
 exists=d.execute("SELECT name FROM sqlite_master WHERE name='kb_board_view_policy'").fetchone()
 row=d.execute('SELECT settings FROM kb_board_view_policy WHERE board_id=?',(b,)).fetchone() if exists else None
 print(row[0] if row else '{}')
`;
 let count=0;
 async function compare(flags,active=true,member=true,actor='rest-member',body={defaultPublicBoardView:'board-view-table'}){
  const doc=JSON.parse(execFileSync('python3',['-c',sql,db,String(id),JSON.stringify(flags),active?'1':'0',member?'1':'0'],{encoding:'utf8'}));doc._id=String(id);doc.members=[{userId:'rest-other',isActive:true,isAdmin:true},...(member?[{userId:'rest-member',isActive:active,...Object.fromEntries(flags.map(f=>[f,true]))}]:[])];
  for(const method of ['get','put']){
   let outcome;const ctx={Meteor:{Error:class extends Error{constructor(code,message){super(message);this.error=code;}}},ReactiveCache:{getBoard:async()=>doc,getUser:async()=>actor==='rest-owner'?{_id:actor,isAdmin:true}:null},require:name=>name==='/models/lib/boardViewSettings'?policy:name==='/models/lib/boardReadAccess'?require(path.join(source,'models/lib/boardReadAccess.js')):{record(){}},sendJsonResult:(_res,r)=>outcome=JSON.parse(JSON.stringify(r)),publicErrorData:e=>({code:e.statusCode||500,data:{error:e.message}}),Boards:{updateAsync:async(_id,update)=>{for(const[key,value]of Object.entries(update.$set)){const parts=key.split('.');let target=doc;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}}}};
   vm.createContext(ctx);vm.runInContext(authCode,ctx);await vm.runInContext(route[method],ctx)({userId:actor,params:{boardId:String(id)},body:structuredClone(body)},{});
   const actual=await call(method,tokens[actor],method==='put'?body:undefined);assert.equal(actual.code,outcome.code,JSON.stringify({method,flags,active,member,actor}));if(outcome.code===200)assert.deepEqual(actual.data,outcome.data);count++;
  }
 }
 try{
  const flags=['isAdmin','isNoComments','isCommentOnly','isWorker','isNormalAssignedOnly','isCommentAssignedOnly','isReadAssignedOnly','isReadOnly'];for(let mask=0;mask<256;mask++)await compare(flags.filter((_,i)=>mask&(1<<i)));
  await compare([],true,false);await compare(['isAdmin'],false,true);await compare(['isReadAssignedOnly'],false,true,'rest-owner');
  for(const raw of [null,true,false,'TRUE',[true],[null,true],[['TRUE']],{},1])await compare(['isAdmin'],true,true,'rest-member',{boardViewSettings:{'board-view-cal':{showOnPublic:raw}}});
  console.log(`Board view REST source conformance: ${count} actual HTTP outcomes match unchanged GET/PUT route and Authentication bodies across all 256 built-in raw flag sets, inactive/nonmember/site-admin cases and boolean/null/array coercion; SQL IDs/owner membership/bearer-to-user/cache and no-op logger adapters explicit, full custom-role/OAuth/DDP/eventlog integration remains pending`);
 }finally{execFileSync('python3',['-c',`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as d:
 for (t,) in d.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
  if 'board_id' in [r[1] for r in d.execute('PRAGMA table_info("'+t+'")')]:d.execute('DELETE FROM "'+t+'" WHERE board_id=?',(sys.argv[2],))
 d.execute('DELETE FROM kb_boards WHERE id=?',(sys.argv[2],))`,db,String(id)]);}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
