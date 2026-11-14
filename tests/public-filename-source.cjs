// Exact public helper bodies, distinct from the raw API disposition helper.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=source=>{
 const raw=fs.readFileSync(path.join(source,'server/routes/universalFileServer.js'),'utf8'),req=createRequire(path.join(source,'package.json')),names=req(path.join(source,'imports/lib/fileNameDisplay.js'));
 function body(name){const start=raw.indexOf('  function '+name+'('),end=raw.indexOf('\n  }',start);if(start<0||end<=start)throw Error('Original public filename helper changed');return raw.slice(start,end+4);}
 const context={sanitizeDownloadFileName:names.sanitizeDownloadFileName};vm.createContext(context);vm.runInContext(body('sanitizeFilenameForHeader')+'\n'+body('buildContentDispositionHeader'),context);
 const attachmentSource=fs.readFileSync(path.join(source,'server/routes/attachmentApi.js'),'utf8'),rawStart=attachmentSource.indexOf('function sendRawFile('),rawEnd=attachmentSource.indexOf('\n}',rawStart);if(rawStart<0||rawEnd<=rawStart)throw Error('Original raw file route helper changed');
 const rawContext={require:id=>{if(id==='/server/lib/importAttachmentStream')return{limitStream:stream=>stream};if(id==='/models/lib/exportFilename')return req(path.join(source,'models/lib/exportFilename.js'));throw Error('Unexpected raw helper dependency');}};vm.createContext(rawContext);vm.runInContext(attachmentSource.slice(rawStart,rawEnd+2),rawContext);
 const apiRaw=name=>{let headers;const stream={on(){return this;},pipe(){}};rawContext.sendRawFile({writeHead(status,value){if(status!==200)throw Error('Unexpected status');headers=value;},destroy(){}},stream,{name,type:'application/octet-stream',size:0},Infinity);return headers['Content-Disposition'];};
 return {apiRaw,clean:names.cleanFileName,public:name=>context.buildContentDispositionHeader('attachment',context.sanitizeFilenameForHeader(name)),api:req(path.join(source,'models/lib/exportFilename.js')).attachmentDisposition};
};
