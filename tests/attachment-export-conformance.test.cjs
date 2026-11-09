// Compare real native HTTP responses with the unchanged source route/Exporter.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const secrets=[process.env.WEBA_TEST_PASSWORD];
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/exporter.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 assert.ok(source,'Original export source required');
 const model=fs.readFileSync(path.join(source,'models/boards.js'),'utf8'),exporterText=fs.readFileSync(path.join(source,'models/exporter.js'),'utf8'),routeText=fs.readFileSync(path.join(source,'models/export.js'),'utf8');
 const start=exporterText.indexOf('export class Exporter {');assert.ok(start>=0);
 const classCode=exporterText.slice(start).replace(/^export /,''),routeStart=routeText.indexOf('if (Meteor.isServer) {');assert.ok(routeStart>=0);
 const caps=require(path.join(source,'models/lib/boardRoleCapabilities.js')),access=require(path.join(source,'models/lib/exportAccess.js')),soft=require(path.join(source,'models/lib/attachmentSoftDelete.js')),permission=require(path.join(source,'models/lib/boardPermission.js')),containment=require(path.join(source,'models/lib/storagePathContainment.js'));
 const method=(name,args)=>{const sig=`  ${name}(${args}) {`,at=model.indexOf(sig),end=model.indexOf('\n  },',at);assert.ok(at>=0&&end>at);return vm.runInNewContext(`(function(${args}){${model.slice(at+sig.length,end)}\n})`,permission);};
 const visible=method('isVisibleBy','user'),active=method('isActiveMember','userId');
 const policyCode=fs.readFileSync(path.join(source,'models/lib/importExportSecurity.js'),'utf8').replace(/\bexport /g,'');
 const db=path.join(process.env.WEBA_DB_HOST,process.env.WEBA_DB_NAME),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-attachment-export-source.'));
 const call=async(url,token)=>{const r=await fetch(process.env.WEBA_TEST_URL+url,{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(15000)});return{status:r.status,data:(r.headers.get('content-type')||'').startsWith('application/json')?await r.json():await r.text()};};
 const seed=()=>JSON.parse(execFileSync(process.env.GBX,['-s','AttachmentFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0'}})),f=seed(),foreign=seed();
 const tokens={};for(const user of ['rest-other','rest-owner','rest-member']){const r=await fetch(process.env.WEBA_TEST_URL+'/users/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:process.env.WEBA_TEST_PASSWORD})});assert.equal(r.status,200);tokens[user]=(await r.json()).token;secrets.push(tokens[user]);}
 const script=`import sqlite3,json,sys,base64
with sqlite3.connect(sys.argv[1]) as d:
 d.row_factory=sqlite3.Row
 b,role,user=sys.argv[2:]
 d.execute("DELETE FROM kb_members WHERE board_id=? AND username IN ('rest-member','rest-owner')",(b,))
 d.execute('DELETE FROM kb_member_flags WHERE board_id=?',(b,))
 d.execute("DELETE FROM kb_removed_members WHERE board_id=? AND username IN ('rest-member','rest-owner')",(b,))
 actual={'combined':'board-admin','globalmember':'read-only','globalassigned':'board-admin','inactive':'normal'}.get(role,role)
 if role not in ('global','owner','none'): d.execute('INSERT INTO kb_members (board_id,username,role) VALUES (?,?,?)',(b,user,actual))
 if role in ('combined','globalassigned'): d.execute("INSERT INTO kb_member_flags (board_id,username,flag) VALUES (?,?,'isReadAssignedOnly')",(b,user))
 if role=='inactive': d.execute('INSERT INTO kb_removed_members (board_id,username) VALUES (?,?)',(b,user))
 files=[]
 for r in d.execute('SELECT f.*,a.mime,m.deleted_at FROM kb_files f LEFT JOIN kb_attachment_data a ON a.file_id=f.id LEFT JOIN kb_attachment_deletions m ON m.file_id=f.id WHERE f.board_id=? ORDER BY f.id',(b,)):
  r=dict(r);r['bytes']=base64.b64encode(r.pop('content') or b'').decode();files.append(r)
 print(json.dumps({'files':files}))
`;
 const setup=`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as d:
 d.execute('UPDATE kb_files SET filename=?,content=? WHERE id=?',('Résumé + <literal> 🚀.bin',b'exact\\x00\\xff',int(sys.argv[2])))
 d.execute('INSERT INTO kb_files (board_id,card_id,filename,content) VALUES (?,?,?,?)',(int(sys.argv[3]),int(sys.argv[4]),'empty.bin',b''))
 print(d.execute('SELECT last_insert_rowid()').fetchone()[0])
`;
 const empty=execFileSync('python3',['-c',setup,db,String(f.otherId),String(f.boardId),String(f.cardId)],{encoding:'utf8'}).trim();
 const deleted=await fetch(process.env.WEBA_TEST_URL+'/api/attachment/delete/'+f.fileId,{method:'DELETE',headers:{Authorization:'Bearer '+tokens['rest-other']}});assert.equal(deleted.status,200);
 const at=(doc,key)=>key.split('.').reduce((a,k)=>a?.[k],doc),match=(doc,q)=>Object.entries(q).every(([key,value])=>key==='$and'?value.every(s=>match(doc,s)):key==='$or'?value.some(s=>match(doc,s)):value===null?at(doc,key)==null:at(doc,key)===value);
 let count=0;
 try{
  async function expected(board,files,user,config){
   let output;const settings={disableAllExport:!!config.disabled};
   const policy=vm.runInNewContext(policyCode+';({assertExportEnabled,refuseDisabledExport})',{require:name=>name==='/models/settings'?{default:{findOneAsync:async()=>settings}}:name==='meteor/meteor'?{Meteor:{Error:class extends Error{constructor(code,reason){super(reason);this.error=code;}}}}:{record(){}}});
   const cache={getBoard:async id=>config.missing||id!==board._id?null:board,getUser:async()=>user,getImpersonatedUser:async()=>false,getAttachments:async q=>files.filter(doc=>match(doc,q))};
   // Native board-defined/admin-only custom field definitions do not exist yet.
   const fieldGuard={assertFieldExport:async()=>{}};

   const routes=new Map(),reqRequire=name=>{
    if(name==='meteor/webapp')return{WebApp:{handlers:{get:(url,fn)=>routes.set(String(url),fn)}}};
    if(name==='/server/apiMiddleware')return{safeRoute:fn=>fn,sendJsonResult:(res,result)=>{output={status:result.code,data:JSON.parse(JSON.stringify(result.data))};}};
    if(name==='/server/authentication')return{Authentication:{checkLoggedIn:id=>{if(!id)throw{statusCode:403,reason:'Forbidden'};}}};
    if(name==='/models/lib/importExportSecurity')return policy;
    if(name==='/server/lib/activeUser')return{activeUserByToken:async token=>token==='valid'?user:null};
    if(name==='/models/lib/exportAccess')return access;
    if(name==='/models/boards')return{default:{findOneAsync:async()=>board}};
    if(name==='/server/lib/securityLog')return{record(){}};
    throw Error('Unexpected source route dependency '+name);
   };
   // The class's own canExport uses its captured require, too.
   const classContext={process:{env:{DEBUG:'false'}},ReactiveCache:cache,liveAttachments:soft.liveAttachments,Buffer,Npm:{require},assertExportEnabled:policy.assertExportEnabled,isReadableStoredFilePath:p=>containment.isPathInsideAny(p,[work]),require:name=>name==='/server/lib/adminOnlyCustomFields'?fieldGuard:name==='/models/lib/exportAccess'?access:(()=>{throw Error('Unexpected exporter dependency '+name);})()};
   const SourceExporter=vm.runInNewContext(classCode+';Exporter',classContext);
   vm.runInNewContext(routeText.slice(routeStart),{process:{env:{DEBUG:'false'}},Meteor:{isServer:true,settings:{public:{sandstorm:false}}},ReactiveCache:cache,Exporter:SourceExporter,EXTERNAL_EXPORT_FORMATS:[],require:reqRequire,ImpersonatedUsers:{insertAsync:async()=>{}},console});
   const handler=routes.get('/api/boards/:boardId/attachments/:attachmentId/export');assert.equal(typeof handler,'function');
   const res={headersSent:false,writeHead(status){this.status=status;this.headersSent=true;},end(data){output={status:this.status,data};}};
   await handler({params:{boardId:config.missing?'99999999':board._id,attachmentId:config.file},query:config.auth==='none'?{}:{authToken:config.auth==='long'?'x'.repeat(10001):config.auth}},res);
   assert.ok(output);return output;
  }
  for(const role of ['global','globalmember','globalassigned','owner','none','normal','read-only','comment-only','worker','normal-assigned-only','combined','inactive']){
   const username=role.startsWith('global')?'rest-owner':role==='owner'?'rest-other':'rest-member';
   const frame=JSON.parse(execFileSync('python3',['-c',script,db,String(f.boardId),role,username],{encoding:'utf8'}));
   const actualRole={combined:'board-admin',globalmember:'read-only',globalassigned:'board-admin',inactive:'normal',owner:'board-admin'}[role]||role;
   const members=[{userId:'rest-other',isActive:true,...caps.flagsForRole('board-admin')}];
   if(username!=='rest-other'&&!['global','none'].includes(role))members.push({userId:username,isActive:role!=='inactive',...caps.flagsForRole(actualRole),...(['combined','globalassigned'].includes(role)?{isReadAssignedOnly:true}:{})});
   const board={_id:String(f.boardId),permission:'private',members,isPublic:()=>false,isVisibleBy:visible,isActiveMember:active},user={_id:username,isAdmin:role.startsWith('global')};
   const files=frame.files.map(file=>{const filename=path.join(work,String(file.id)+'.bin');fs.writeFileSync(filename,Buffer.from(file.bytes,'base64'));return{_id:String(file.id),name:file.filename,type:file.mime||'application/octet-stream',meta:{boardId:String(file.board_id),cardId:String(file.card_id)},versions:{original:{path:filename}},...(file.deleted_at?{deletedAt:new Date(file.deleted_at)}:{})};});
   for(const file of [String(f.otherId),String(f.fileId),empty,String(foreign.fileId),'missing']){
    const contract=await expected(board,files,user,{file,auth:'valid'});
    for(const query of [false,true]){const url=`/api/boards/${f.boardId}/attachments/${file}/export`+(query?'?authToken='+encodeURIComponent(tokens[username]):'');const actual=await call(url,query?null:tokens[username]);assert.deepEqual(actual,contract,JSON.stringify({role,file,query}));count++;}
   }
  }
  const board={_id:String(f.boardId),permission:'private',members:[],isPublic:()=>false,isVisibleBy:visible,isActiveMember:active},user={_id:'rest-other'};
  for(const config of [{auth:'none'},{auth:'invalid'},{auth:'long'},{auth:'invalid',missing:true},{auth:'long',missing:true},{auth:'invalid',missing:true,disabled:true}]){
   execFileSync('python3',['-c','import sqlite3,sys\nwith sqlite3.connect(sys.argv[1]) as d:d.execute("UPDATE import_export_settings SET disable_export=? WHERE id=1",(int(sys.argv[2]),))',db,config.disabled?'1':'0']);
   const expectedResult=await expected(board,[],user,{file:String(f.fileId),...config}),url=`/api/boards/${config.missing?'99999999':f.boardId}/attachments/${f.fileId}/export`+(config.auth==='none'?'':'?authToken='+(config.auth==='long'?'x'.repeat(10001):'invalid'));
   assert.deepEqual(await call(url),expectedResult,JSON.stringify(config));count++;
  }
  console.log(`Attachment export source conformance: ${count} actual native query/bearer HTTP results match unchanged export route, Exporter.build/canExport and role/visibility/live helpers across 12 role/scope states, bytes/Unicode/zero/deleted/foreign/missing files and auth/policy order; numeric IDs, private boards, token transport, SQL-to-filesystem and absent custom-field-definition/security-log adapters explicit, full source public/storage/DDP/admin-field models remain pending`);
 }finally{execFileSync('python3',['-c','import sqlite3,sys\nwith sqlite3.connect(sys.argv[1]) as d:d.execute("UPDATE import_export_settings SET disable_export=0 WHERE id=1")',db]);fs.rmSync(work,{recursive:true,force:true});}
})().catch(error=>{let message=error.stack||String(error);for(const secret of secrets.filter(Boolean))message=message.split(secret).join('[redacted]');console.error(message);process.exitCode=1;});
