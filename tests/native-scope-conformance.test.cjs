// Native capability/card reads compared with current, actual WeKan functions.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE;
if(!source){let ancestor=path.resolve(__dirname,'..');while(path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/boardCardScope.js'))){source=ancestor;break;}ancestor=path.dirname(ancestor);}}
if(!source){console.log('SKIP native scope matrix: original source unavailable; native parity remains unverified');process.exit(0);}
assert.ok(process.env.TMPDIR,'repository-local TMPDIR required');
const caps=require(path.join(path.resolve(source),'models/lib/boardRoleCapabilities.js'));
const scope=require(path.join(path.resolve(source),'models/lib/boardCardScope.js'));
const flags=Object.values(caps.ROLE_FLAGS).filter(Boolean);
assert.equal(flags.length,8,'audit new source flags');
const cases=Array.from({length:2**flags.length},(_,mask)=>Object.fromEntries(flags.map((flag,index)=>[flag,!!(mask&(1<<index))])));
const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-native-scope.'));
try{
 const root=path.resolve(__dirname,'..');
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});
 fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
 fs.copyFileSync(path.join(__dirname,'NativeScopeMatrix.module'),path.join(work,'.src/NativeScopeMatrix.module'));
 fs.writeFileSync(path.join(work,'.public/native-scope-cases.json'),JSON.stringify(cases));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
 const env={...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''};
 const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','NativeScopeMatrix',work],{env,encoding:'utf8',maxBuffer:1024*1024}));
 assert.equal(actual.length,cases.length);
 cases.forEach((raw,index)=>{
  const member={userId:'matrix-member',isActive:true,...raw},board={members:[member]};
  const role=caps.memberRoleOf(member),restricted=scope.isAssignedOnlyMember(board,member.userId);
  const expected={role,seesAllCards:!restricted,comment:caps.roleCan(role,'comment'),write:caps.roleCan(role,'write'),manageBoard:caps.roleCan(role,'manageBoard'),moveCard:caps.roleCan(role,'moveCard'),count:restricted?1:2,
   hiddenReadable:scope.assignedOnlyAllowsCard(board,member.userId,{assignees:['matrix-owner']}),
   assignedReadable:scope.assignedOnlyAllowsCard(board,member.userId,{assignees:[member.userId]})};
  assert.deepEqual(actual[index],expected,'native source flag mask '+index+' '+JSON.stringify(raw));
 });
 console.log('Native scope conformance: all 256 active built-in flag combinations match actual source roleCan/memberRoleOf/isAssignedOnlyMember/assignedOnlyAllowsCard and real native card queries');
}finally{fs.rmSync(work,{recursive:true,force:true});}
