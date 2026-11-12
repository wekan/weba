'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/focalboardFormat.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const {formatFocalboard}=await import(pathToFileURL(path.join(source,'models/lib/focalboardFormat.js')).href),window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../WeKan/.public/batch-export.js'),'utf8'),{window,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Blob,URL:{},atob});const api=window.webaBatchExport;
 function frame(raw){
  const expected=formatFocalboard({board:{_id:'1',title:'Literal Ω'},lists:[{title:'Todo'}],items:[{cardId:'1',title:'Literal',listTitle:'Todo',labels:[],customFields:{Amount:Number(raw),Enabled:false,Text:'before\0after Ω'}}]},{now:1767225600000}),rows=expected.trimEnd().split('\n').map(line=>JSON.parse(line)),board=rows.find(row=>row.type==='board'),card=rows.find(row=>row.type==='block'&&row.data.type==='card'),pid=board.data.cardProperties.find(field=>field.name==='Amount').id;
  rows[0].__weba_focalboard_numbers={[card.data.id]:{[pid]:raw}};card.data.fields.properties[pid]=raw;
  return {expected,rows,card:card.data.id,pid,content:rows.map(row=>JSON.stringify(row)).join('\n')+'\n'};
 }
 for(const raw of ['-0','0','0x10','1e21','1000000000000000100','1e-7','0.000001','5e-324','1.7976931348623157e308','2.675','2.2250738585072014e-308']){const f=frame(raw);assert.equal(api.focalboardText(f.content),f.expected);}
 const f=frame('1e21');assert.equal(api.focalboardText(f.expected),f.expected);assert.equal(api.focalboardText('not JSONL\n'),'not JSONL\n');
 const bad=change=>{const rows=JSON.parse(JSON.stringify(f.rows));change(rows);assert.throws(()=>api.focalboardText(rows.map(row=>JSON.stringify(row)).join('\n')+'\n'),/Invalid board export/);};
 bad(rows=>{rows[0].extra=true;});bad(rows=>{rows[0].__weba_focalboard_numbers={};});bad(rows=>{rows[0].__weba_focalboard_numbers[f.card][f.pid]='Infinity';});bad(rows=>{rows[0].__weba_focalboard_numbers[f.card][f.pid]='1\0tail';});bad(rows=>{rows[0].__weba_focalboard_numbers[f.card]['p'+'0'.repeat(26)]='1';});bad(rows=>{rows[0].__weba_focalboard_numbers['c'+'0'.repeat(26)]={[f.pid]:'1'};});bad(rows=>{rows.find(row=>row.type==='block'&&row.data.type==='card').data.fields.properties[f.pid]='wrong';});bad(rows=>{rows.push(rows.find(row=>row.type==='block'&&row.data.type==='card'));});bad(rows=>{rows.find(row=>row.type==='block'&&row.data.type==='card').data.id={};});assert.throws(()=>api.focalboardText(f.content.trimEnd()),/Invalid board export/);
 const bytes=api.archive([{name:'board-1.jsonl',content:f.content}]),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),start=30+view.getUint16(26,true);assert.equal(Buffer.from(bytes.subarray(start,start+view.getUint32(18,true))).toString(),f.expected);
 console.log('Focalboard custom numeric renderer: unchanged source JSONL for canonical IEEE edge strings, NUL/Boolean text, strict marker/header/reference/duplicate/value failures, actual ZIP bytes and unchanged unmarked JSONL passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
