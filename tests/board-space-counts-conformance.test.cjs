// Compare actual native workspace helper exclusions with the original helper.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/helperBoards.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
if(!source)throw Error('Original helperBoards source unavailable; count conformance unverified');
const {isHelperBoardTitle}=require(path.join(source,'models/lib/helperBoards.js'));
const titles=['','^','^^','^Subtasks^','^Anything at all^','Subtasks','^Subtasks','Subtasks^','My ^Subtasks^ board','^Å työtila^'];
for(const separator of ['\n','\r','\r\n','\u2028','\u2029'])titles.push('^line'+separator+'break^','^trailing^'+separator,separator+'^leading^');
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-space-counts-source.'));
try{
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});
 fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
 fs.copyFileSync(path.join(__dirname,'BoardSpaceCountsMatrix.module'),path.join(work,'.src/BoardSpaceCountsMatrix.module'));
 fs.writeFileSync(path.join(work,'.public/space-count-titles.json'),JSON.stringify(titles));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
 const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardSpaceCountsMatrix',work],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));
 assert.deepEqual(actual,titles.map(title=>({title,count:isHelperBoardTitle(title)?0:1})));
 console.log(`Workspace count source conformance: ${titles.length} actual native counts match the original helperBoards classification, including Unicode and legacy line terminators; full workspace UI/wire parity remains pending`);
}finally{fs.rmSync(work,{recursive:true,force:true});}
