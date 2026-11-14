// Exact public helper bodies, distinct from the raw API disposition helper.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=source=>{
 const raw=fs.readFileSync(path.join(source,'server/routes/universalFileServer.js'),'utf8'),req=createRequire(path.join(source,'package.json')),names=req(path.join(source,'imports/lib/fileNameDisplay.js'));
 function body(name){const start=raw.indexOf('  function '+name+'('),end=raw.indexOf('\n  }',start);if(start<0||end<=start)throw Error('Original public filename helper changed');return raw.slice(start,end+4);}
 const context={sanitizeDownloadFileName:names.sanitizeDownloadFileName};vm.createContext(context);vm.runInContext(body('sanitizeFilenameForHeader')+'\n'+body('buildContentDispositionHeader'),context);
 return {clean:names.cleanFileName,public:name=>context.buildContentDispositionHeader('attachment',context.sanitizeFilenameForHeader(name)),api:req(path.join(source,'models/lib/exportFilename.js')).attachmentDisposition};
};
