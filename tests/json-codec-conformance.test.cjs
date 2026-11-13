// Standard JSON.parse oracle for the native backup decoder, including IEEE bits.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const project=process.env.WEBA_TEST_JSON_PROJECT;
assert.ok(project,'Isolated native JSON project required');assert.ok(process.env.TMPDIR,'Repository-local TMPDIR required');
const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-json-cases.'));
const cases=[],add=(input,extra={})=>cases.push({input,...extra});
const backup=values=>({format:'weba-2',kind:'board',title:'Native JSON',lanes:[],lists:[],cards:[],entries:[],files:[],metadata:[],...values});
add(JSON.stringify(backup({cards:[{title:'before\0after Ω😀',description:'',labels:null,archived:false,amount:0}],extra:{'':'empty key','key\0tail':'nul key',empty:'',nullable:null}})),{backup:true});
for(const input of ['null','true','false','0','-0','-0.0','-0e9999','1','-1','2.675','9007199254740993','1000000000000000100','5e-324','2.2250738585072014e-308','1.7976931348623157e308','1.7976931348623159e308','1e309','-1e309','1e-99999','-1e-99999','0.1000000000000000055511151231257827021181583404541015625'])add(input);
for(const value of ['','\0','before\0after','\b\f\n\r\t"\\/','Ω😀中文العربية','\\u0000','\\ud83d\\ude00']){
  add(JSON.stringify(value));add(JSON.stringify({value,'':value,'key\0tail':value}));
}
for(const input of ['"\\u0000"','"\\ud83d\\ude00"','"\\uD83D\\uDE00"','"\\ud800"','"\\udfff"','"\\ud800x"','"\\ud800\\ud801\\udc00"','"\\ud800\\u0000\\udc00"','{"\\ud800":"\\udfff","\\u0000":""}','{"a":1,"b":2,"a":null}','{"a":"","b":null,"a":"kept"}','{"__proto__":{"polluted":true},"constructor":"literal","prototype":false}',' [ true, false, null, "", 0, {}, [] ] \r\n\t'])add(input);
add('{"2":"two","1":"one","01":"literal","4294967294":true,"4294967295":false,"0":null,"":"empty"}');
add('{'+Array.from({length:10000},(_,i)=>JSON.stringify(String(9999-i))+':true').join(',')+'}');
// Decimal tails beyond the binary64 midpoint length must still affect rounding.
for(const input of ['1.'+'0'.repeat(10000)+'1','0.'+'0'.repeat(10000)+'1','1'+'0'.repeat(10000)+'e-10000','0.1000000000000000055511151231257827021181583404541015625'+'0'.repeat(5000)+'1','1e'+'9'.repeat(10000),'-0e'+'9'.repeat(10000)])add(input);
// Deterministic ordinary Unicode/control trees and decimal strings.
let seed=0x6a09e667;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let i=0;i<80;i++){
  const text=Array.from({length:12},()=>String.fromCodePoint([0,1,8,12,34,92,127,255,937,0x4e2d,0x1f600,0x10ffff][Math.floor(random()*12)])).join('');
  add(JSON.stringify({i,text,empty:'',nil:null,values:[i%2===0,text,[{},[]]],nested:{[text]:text}}));
  add((random()<.5?'-':'')+(Math.floor(random()*9)+1)+String(Math.floor(random()*1e15)).padStart(15,'0')+'.'+String(Math.floor(random()*1e15)).padStart(15,'0')+'e'+(Math.floor(random()*650)-325));
}
for(const input of ['', ' ', 'undefined','NaN','Infinity','+1','01','-01','00','-','1.','1e','1e+','1e-','.1','0x10','[1,]','{"a":1,}','{a:1}','{"a" 1}','{"a":}','[','{','"unterminated','"\\x00"','"\\v"','"\\u000"','"\\uGGGG"','"raw\nline"','true false','1x','{}[]','\ufeff{}','"\0"'])add(input,{reject:true});
for(const bytes of [[34,0xc0,0x80,34],[34,0xed,0xa0,0x80,34],[34,0xf4,0x90,0x80,0x80,34],[34,0xe2,0x82,34],[34,0xff,34]])add(Buffer.from(bytes),{reject:true});
add('['.repeat(128)+'0'+']'.repeat(128));add('['.repeat(129)+'0'+']'.repeat(129),{reject:true});
add('"'+'a'.repeat(20*1024*1024)+'"',{reject:true});
for(const input of ['null','[]','1','{}','{"format":null}','{"format":"other"}'])add(input,{backup:true,reject:true});
for(const field of ['lanes','lists','cards','entries','files','metadata']){
  for(const invalid of [null,{},'',0,false])add(JSON.stringify(backup({[field]:invalid})),{backup:true,reject:true});
}
if(process.env.WEBA_JSON_LEGACY==='1')cases.splice(1);
const expectedBits=value=>{const rows=[];function visit(value,p){if(typeof value==='number'){const b=Buffer.alloc(8);os.endianness()==='LE'?b.writeDoubleLE(value):b.writeDoubleBE(value);rows.push([p,b.toString('hex').toUpperCase()]);}else if(value&&typeof value==='object'){for(const key of Object.keys(value))visit(value[key],p+'/'+key.replaceAll('~','~0').replaceAll('/','~1'));}}visit(value,'');return rows;};
try{
  cases.forEach((c,i)=>{fs.writeFileSync(path.join(work,i+'.json'),c.input);if(c.backup)fs.writeFileSync(path.join(work,i+'.backup'),'1');});
  const output=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','JsonCodecTest',project],{encoding:'utf8',env:{...process.env,WEBA_JSON_INPUT_DIR:work,WEBA_JSON_COUNT:String(cases.length)},maxBuffer:32*1024*1024}));
  assert.equal(output.length,cases.length);let valid=0,invalid=0;
  for(const [i,c] of cases.entries()){
    const row=output[i],label='case '+i+' '+String(c.input).slice(0,90);
    if(c.reject){assert.equal(row.ok,false,label);assert.match(row.error,/JSON|MiB|weba/,label);invalid++;continue;}
    const expected=JSON.parse(c.input);assert.equal(row.ok,true,label+': '+row.error);
    assert.deepEqual(JSON.parse(row.content),JSON.parse(JSON.stringify(expected)),label);
    assert.deepEqual(row.bits,expectedBits(expected),label+' IEEE bits');
    if(expected&&typeof expected==='object'&&!Array.isArray(expected)){
      assert.deepEqual(row.keys,Object.keys(expected),label+' object keys');assert.deepEqual(JSON.parse(row.copy),JSON.parse(JSON.stringify(expected)),label+' shallow copy');
    }
    valid++;
  }
  assert.equal({}.polluted,undefined);
  console.log('Native JSON codec: '+valid+' standard JSON.parse trees and IEEE bit cases, '+invalid+' malformed/UTF-8/depth/size refusals; NUL, surrogates/lone units, empty/null values and keys, duplicate ordering, prototype names, long decimal tails, subnormals/overflow and actual backup ReadData covered');
}finally{fs.rmSync(work,{recursive:true,force:true});}
