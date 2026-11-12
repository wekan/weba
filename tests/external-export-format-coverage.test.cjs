'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/externalExportFormatters.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const {EXTERNAL_EXPORT_FORMATS}=await import(pathToFileURL(path.join(source,'models/lib/externalExportFormatters.js')).href),queue=fs.readFileSync(path.join(__dirname,'../WeKan/.src/BoardBatchExport.module'),'utf8'),native=[...queue.matchAll(/format <> "([^"]+)"/g)].map(match=>match[1]).filter(name=>!['weba','csv','scsv','tsv','excel'].includes(name));assert.equal(new Set(native).size,native.length);assert.deepEqual(native.sort(),[...EXTERNAL_EXPORT_FORMATS].sort());
 console.log(`External export format coverage: all ${native.length} current source tool formats have native selected-export entries; semantic/model/full UI/API/security parity remains separately pending`);
})().catch(error=>{console.error(error);process.exitCode=1;});
