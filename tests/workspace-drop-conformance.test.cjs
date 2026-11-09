// Native transactional drops vs the original immutable workspace tree helper.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/workspacesTree.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
if(!source)throw Error('Original workspace tree source unavailable');
const helper=require(path.join(source,'models/lib/workspacesTree.js'));
const node=(name,children=[])=>({name,children});
const tree=[node('A',[node('A1',[node('A11')]),node('A2')]),node('B',[node('B1')]),node('C')];
const cases=[];
for(const position of ['before','after','inside','invalid'])for(const source of ['A','A1','A11','A2','B','B1','C'])for(const target of ['A','A1','A11','A2','B','B1','C'])cases.push({source,target,position});
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-space-drop-source.'));
try{
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});
 fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
 fs.copyFileSync(path.join(__dirname,'BoardSpaceDropMatrix.module'),path.join(work,'.src/BoardSpaceDropMatrix.module'));
 fs.writeFileSync(path.join(work,'.public/space-drop-tree.json'),JSON.stringify(tree));
 fs.writeFileSync(path.join(work,'.public/space-drop-cases.json'),JSON.stringify(cases));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
 const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardSpaceDropMatrix',work],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));
 assert.equal(actual.length,cases.length);
 for(const [index,row] of actual.entries()){
   const next=helper.moveWorkspace(row.before,row.source,row.target,row.position);
   assert.deepEqual(row.after,next||row.before,JSON.stringify(cases[index]));
   assert.equal(row.denied,next===null,'native refusal: '+JSON.stringify(cases[index]));
 }
 console.log(`Workspace drop source conformance: ${cases.length} actual native before/after/inside/invalid moves match original workspacesTree on nested SQL trees, including root edges, descendants and no-ops; full UI/wire parity remains pending`);
}finally{fs.rmSync(work,{recursive:true,force:true});}
