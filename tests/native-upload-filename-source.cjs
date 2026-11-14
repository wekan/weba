'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=source=>{
 const raw=fs.readFileSync(path.join(source,'models/attachments.js'),'utf8'),start=raw.indexOf('  onBeforeUpload(file) {'),end=raw.indexOf('\n  },',start);if(start<0||end<=start)throw Error('Original pre-upload hook changed');
 const body=raw.slice(start+2,end+4).replace('onBeforeUpload(file) {','function(file) {'),context={cleanFileName:createRequire(path.join(source,'package.json'))(path.join(source,'imports/lib/fileNameDisplay.js')).cleanFileName};
 const fn=vm.runInNewContext('('+body+')',context),before=name=>{const file={name};if(fn(file)!==true)throw Error('Unexpected pre-upload refusal');return file.name;};before.sourceBody=raw.slice(start+2,end+4);return before;
};
