'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},context={window,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Blob,URL:{createObjectURL(){throw Error('download not expected');}},atob};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../WeKan/.public/batch-export.js'),'utf8'),context);
const files=[{name:'board-7.json',content:JSON.stringify({format:'weba-2',title:'Alpha Ω',text:'</script>\u2028'})},{name:'board-9.json',content:JSON.stringify({format:'weba-2',title:'Bravo',zero:0,flag:false})}],bytes=window.webaBatchExport.archive(files),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder();
let at=0,index=0;
while(view.getUint32(at,true)===0x04034b50){const size=view.getUint32(at+18,true),nameSize=view.getUint16(at+26,true),extraSize=view.getUint16(at+28,true),name=decoder.decode(bytes.subarray(at+30,at+30+nameSize)),start=at+30+nameSize+extraSize;assert.equal(name,files[index].name);assert.deepEqual(JSON.parse(decoder.decode(bytes.subarray(start,start+size))),JSON.parse(files[index].content));at=start+size;index++;}
assert.equal(index,2);assert.equal(view.getUint32(at,true),0x02014b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-12,true),2);
const csv=window.webaBatchExport.archive([{name:'board-11.csv',content:'"Title"\r\n"\'=formula"'}]);assert.equal(new DataView(csv.buffer).getUint32(0,true),0x04034b50);
const tsv=window.webaBatchExport.archive([{name:'board-12.tsv',content:'"Title"\t"Description"'}]);assert.equal(new DataView(tsv.buffer).getUint32(0,true),0x04034b50);
for(const bad of [[],[{name:'../escape.json',content:'{}'}],[{name:'board-0.json',content:'{}'}],[{name:'board-1.xlsx',content:'x'}],[{name:'board-1.json',content:1}]])assert.throws(()=>window.webaBatchExport.archive(bad),/Invalid board export/);
console.log('Selected export ZIP: stored UTF-8 JSON entries, central directory and strict server filename/content envelope passed');
