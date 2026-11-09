// Actual native SQL policy and conversion results vs unchanged source helpers.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'client/components/settings/attachments.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Original policy source required');
 const ui=fs.readFileSync(path.join(source,'client/components/settings/attachments.js'),'utf8'),api=fs.readFileSync(path.join(source,'server/routes/attachmentApi.js'),'utf8');
 const body=(text,start)=>{const at=text.indexOf(start),end=text.indexOf('\n}',at);assert.ok(at>=0&&end>at,start);return text.slice(at,end+2);};
 const declaration=(text,start)=>{const at=text.indexOf(start),end=text.indexOf('\n};',at);assert.ok(at>=0&&end>at,start);return text.slice(at,end+3);};
 const constants=['const LIMIT_UNIT_FACTORS =','const LIMIT_MODES =','const DEFAULT_LIMIT_SETTINGS =','const LIMIT_BLOCKED_FIELDS ='].map(start=>declaration(ui,start)).join('\n');
 const names=['toNonNegativeInteger','normalizeLimitSettings','getBlockedFieldName','pickModeForLimit','pickUnitForBytes','toDisplayValue','toBytes'],code=constants+names.map(name=>body(ui,'function '+name+'(')).join('\n'),helpers=vm.runInNewContext(code+'\n({'+names.join(',')+'})');
 const cases=[{type:'default'}];for(const value of ['0','0.1','0.5','1','1.25','1.5','2.49','2.5','1024','1e2','1e','1e+','3junk','0x10','.5','+1.5','-0','-1','NaN','Infinity','1e309','','1e300'])for(const unit of [0,1,2])for(const mode of [0,1,2])cases.push({type:'form',value,unit,mode});
 for(const size of [0,1,512,1048576,1073741824,1572864,0.5,1e-7,1e20,1e21,67108864,67108865,1e300])for(const blocked of [false,true])cases.push({type:'stored',size,blocked});
 const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-transfer-policy-source.'));
 try{
  for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'TransferPolicyMatrix.module'),path.join(work,'.src/TransferPolicyMatrix.module'));fs.writeFileSync(path.join(work,'.public/transfer-policy-cases.json'),JSON.stringify(cases.map(c=>c.type==='stored'?{...c,size:String(c.size)}:c)));execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
  const rows=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','TransferPolicyMatrix',work],{encoding:'utf8',env:{...process.env,ATTACHMENT_API_MAX_UPLOAD_BYTES:'1024',ATTACHMENT_API_MAX_DOWNLOAD_BYTES:'512',WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db'}}));assert.equal(rows.length,cases.length);
  const apiCode=api.match(/^const HARD_MAX_API_FILE_BYTES = .+;$/m)[0]+['normalizeConfiguredLimit','getEffectiveApiFileLimit','parseNonNegativeInt'].map(name=>body(api,'function '+name+'(')).join('\n')+'\n'+body(api,'async function getApiTransferLimits(');
  for(const[i,c]of cases.entries()){
   const row=rows[i];if(c.type==='form'){
    const bytes=helpers.toBytes(c.value,['gb','mb','bytes'][c.unit]),valid=c.mode!==1||bytes!==null&&Number.isFinite(bytes)&&bytes>0;
    assert.equal(row.valid,valid,JSON.stringify(c));if(valid)assert.deepEqual(row.data,JSON.parse(JSON.stringify({maxBytes:c.mode===1?bytes:0,blocked:c.mode===2})),JSON.stringify(c));
   }else{
    const limits=c.type==='default'?{}:Object.fromEntries([...['attachmentsUpload','attachmentsDownload','apiUpload','apiDownload'].map(k=>[k+'MaxBytes',c.size]),...['attachmentsUpload','attachmentsDownload','apiUpload','apiDownload','avatarsUpload'].map(k=>[k+'Blocked',c.blocked])]),doc={limitSettings:limits},expected=helpers.normalizeLimitSettings(doc);
    assert.deepEqual(row.settings,JSON.parse(JSON.stringify(expected)),JSON.stringify(c));assert.equal(['gb','mb','bytes'][row.unit],helpers.pickUnitForBytes(expected.apiUploadMaxBytes),JSON.stringify(c));
    const result=await vm.runInNewContext(apiCode+'\ngetApiTransferLimits()', {process:{env:{ATTACHMENT_API_MAX_UPLOAD_BYTES:'1024',ATTACHMENT_API_MAX_DOWNLOAD_BYTES:'512'}},AttachmentStorageSettings:{findOneAsync:async()=>doc}});
    assert.equal(row.uploadLimit,result.effectiveApiUploadMaxBytes,JSON.stringify(c));assert.equal(row.downloadLimit,result.effectiveApiDownloadMaxBytes,JSON.stringify(c));
   }
  }
  console.log(`Transfer policy source conformance: ${cases.length} actual native form/SQL normalization/unit/API-limit outcomes match unchanged source helper bodies, with explicit native mode/unit, scientific fixture-number and finite-number schema adapters; full original settings/storage/DDP callbacks remain pending`);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
