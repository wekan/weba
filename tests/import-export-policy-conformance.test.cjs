'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/importExportSecurity.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original import/export security source required');
 const code=fs.readFileSync(path.join(source,'models/lib/importExportSecurity.js'),'utf8').replace(/\bexport /g,''),cases=[];
 for(const disableAllImport of [null,false,true])for(const disableAllExport of [null,false,true])cases.push({disableAllImport,disableAllExport});
 const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-exchange-source.'));
 try{
  for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'ImportExportPolicyMatrix.module'),path.join(work,'.src/ImportExportPolicyMatrix.module'));fs.writeFileSync(path.join(work,'.public/exchange-policy-cases.json'),JSON.stringify(cases));execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
  const rows=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','ImportExportPolicyMatrix',work],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));assert.equal(rows.length,cases.length);
  for(const [i,row]of rows.entries()){
   let logged=0;const functions=vm.runInNewContext(code+';({getImportExportSecuritySettings,assertImportEnabled,assertExportEnabled,refuseDisabledExport})',{require:name=>{
    if(name==='/models/settings')return{default:{findOneAsync:async()=>cases[i]}};
    if(name==='/server/lib/securityLog')return{record:()=>logged++};
    if(name==='meteor/meteor')return{Meteor:{Error:class extends Error{constructor(code,reason){super(reason);this.error=code;}}}};
    throw Error('Unexpected source dependency '+name);
   }}),settings=await functions.getImportExportSecuritySettings();
   assert.equal(row.importAllowed,!settings.disableAllImport);assert.equal(row.exportAllowed,!settings.disableAllExport);
   for(const [kind,guard]of [['import',functions.assertImportEnabled],['export',functions.assertExportEnabled]]){let failure;try{await guard();}catch(error){failure=error;}assert.equal(!!failure,!row[kind+'Allowed']);if(failure){assert.equal(failure.message,row[kind+'Error']);assert.equal(failure.error,kind+'-disabled');}}
   const response={headersSent:false,writeHead(code,headers){this.code=code;this.headers=headers;this.headersSent=true;},end(body){this.body=body;}};
   assert.equal(await functions.refuseDisabledExport(response),!row.exportAllowed);
   if(!row.exportAllowed){assert.equal(response.code,403);assert.equal(response.body,row.exportError);assert.equal(response.headers['Content-Type'],'text/plain; charset=utf-8');assert.equal(logged,2);}else{assert.equal(response.code,undefined);assert.equal(logged,0);}
  }
  console.log('Import/export policy source conformance: 9 native SQL boolean/null combinations match unchanged settings/defaults, import/export assertions and HTTP refusal helper; typed singleton/Meteor error/security-log adapters explicit, native HTTP export routes/avatar/anonymization/eventlog/full original suites remain pending');
 }finally{fs.rmSync(work,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
