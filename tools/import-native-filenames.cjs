// Bundle the same offline policy/data for a compiled Gambas app; no runtime Node.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),data=path.join(root,'runtime/filename-data'),out=path.join(root,'WeKan/.public'),read=p=>fs.readFileSync(path.join(root,p)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let source=process.argv[2]||process.env.WEKAN_SOURCE,ancestor=root;while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/attachments.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original source required');
const original=fs.readFileSync(path.join(source,'models/attachments.js'),'utf8'),start=original.indexOf('  onBeforeUpload(file) {'),end=original.indexOf('\n  },',start);
if(start<0||end<=start)throw Error('Original pre-upload hook changed');
const sourceHook=original.slice(start+2,end+4),emptyGuard=JSON.parse(read('vendor/meteor-files/empty-file-guard.json')),emptyEvents=[];
class SourceError{constructor(code,reason){this.code=code;this.reason=reason;}}
const emptyFn=require('node:vm').runInNewContext('(function(){'+emptyGuard.guard+'})',{Meteor:{Error:SourceError}});
emptyFn.call({fileData:{size:0},result:null,emit:(...args)=>emptyEvents.push(args)});
const emptyMessage=emptyEvents[0]?.[1]?.reason;if(typeof emptyMessage!=='string')throw Error('Source empty guard changed');
const client=Buffer.from(read('tools/native-upload-client.js').toString().replace('/* WEKAN_ON_BEFORE_UPLOAD */',sourceHook.replace('onBeforeUpload(file) {','function(file) {')).replace('/* WEKAN_EMPTY_FILE_MESSAGE */',JSON.stringify(emptyMessage)));
fs.writeFileSync(path.join(out,'native-upload-filenames.js'),client);fs.copyFileSync(path.join(root,'vendor/meteor-files/LICENSE'),path.join(out,'native-upload-LICENSE.txt'));
const policy=read('runtime/filename_policy.py'),driver=read('tools/native-filename-driver.py'),packed=fs.readFileSync(path.join(data,'normalization.json.gz')),encoded=Buffer.from(packed.toString('base64')),script=Buffer.concat([policy,Buffer.from('\n'),driver]),mimePacked=fs.readFileSync(path.join(data,'mime.json.gz')),mimeEncoded=Buffer.from(mimePacked.toString('base64'));
if(encoded.length+mimeEncoded.length+script.length>96000)throw Error('Native argument budget exceeded; keep data portable');
fs.writeFileSync(path.join(out,'native-mime-data.b64'),mimeEncoded);
for(const name of ['mime-types','mime-db'])fs.copyFileSync(path.join(data,'LICENSE-'+name+'.txt'),path.join(out,'native-'+name+'-LICENSE.txt'));
fs.writeFileSync(path.join(out,'native-filename-policy.py'),script);fs.writeFileSync(path.join(out,'native-filename-data.b64'),encoded);fs.copyFileSync(path.join(data,'LICENSE-Unicode.txt'),path.join(out,'native-filename-LICENSE.txt'));
fs.writeFileSync(path.join(root,'vendor/wekan-filenames/native-manifest.json'),JSON.stringify({postPolicySourceSha256:hash(fs.readFileSync(path.join(source,'models/lib/uploadFileName.js'))),emptyGuardSha256:hash(emptyGuard.guard),sourceHookSha256:hash(sourceHook),clientTemplateSha256:hash(read('tools/native-upload-client.js')),clientSha256:hash(client),policySha256:hash(policy),driverSha256:hash(driver),scriptSha256:hash(script),dataSha256:hash(packed),base64Sha256:hash(encoded),mimeDataSha256:hash(mimePacked),mimeBase64Sha256:hash(mimeEncoded),mimeArgumentBytes:mimeEncoded.length,scriptBytes:script.length,dataArgumentBytes:encoded.length},null,2)+'\n');
console.log('Bundled native filename policy: '+script.length+' script bytes, '+(encoded.length+mimeEncoded.length)+' public data argument bytes');
