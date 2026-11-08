// Compare the native UTC/epoch subset with the actual parent pure helpers.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
let root=process.env.WEKAN_SOURCE;
if(!root){let p=path.resolve(__dirname,'..');while(path.dirname(p)!==p){if(fs.existsSync(path.join(p,'server/lib/restCardHelpers.js'))){root=p;break;}p=path.dirname(p);}}
if(!root){console.log('SKIP date source conformance: reference checkout unavailable; full date parsing remains unverified');process.exit(0);}
const helpers=fs.readFileSync(path.join(root,'server/lib/restCardHelpers.js'),'utf8').replace(/export function /g,'function ');
const utils=fs.readFileSync(path.join(root,'server/lib/utils.js'),'utf8');
const start=utils.indexOf('export function isCardDateClear(');assert.ok(start>=0);
const clear=utils.slice(start,utils.indexOf('\n}',start)+2).replace('export ','');
const context={};vm.runInNewContext(helpers+'\n'+clear+'\nglobalThis.parse=parseCardDate;globalThis.clear=isCardDateClear;',context);
const inputs=['2026-06-20T12:34:56.123Z','2026-06-20','2026-06','2024-02-29','2026-02-30',
 '2026-06-20T12:34:56.123456Z','2026-06-20T12:34Z','2026-06-20T24:00:00Z',
 '2026-06-20T12:34:56+03:30','2026-06-20T12:34:56-0430','0000-01-01T00:00:00Z',
 '-000001-01-01T00:00:00Z','+010000-01-01T00:00:00Z',8640000000000000,-8640000000000000,
 '8640000000000000','-8640000000000000','0000000000001','-0001',
 0,-1,1.9,-1.9,1767225600000,'1767225600000','0','-1','2026',
 '',null,'null','   ','not-a-date','2026-13-99','2026-06-20T25:00Z',
 '2026-06-20T12:30:60Z','2026-06-20T12:30+24:00',true,false,{},[],8640000000000001];
inputs.push('2026-06-20T12:30+0:330','2026-06-20T12:30+0:3:30');
const actual=JSON.parse(execFileSync(process.env.WEBA_TEST_RUNNER||process.env.GBX,['-s','CardDatesConformance',process.env.WEBA_TEST_APPLICATION||process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_DATE_CASES:JSON.stringify(inputs)}}));
assert.equal(actual.length,inputs.length);
inputs.forEach((value,i)=>{const clear=context.clear(value),parsed=context.parse(value);const expected=clear||!!parsed;
 assert.equal(actual[i].valid,expected,JSON.stringify(value)+" "+JSON.stringify(actual[i]));
 if(expected){assert.equal(actual[i].clear,clear,JSON.stringify(value));if(!clear){assert.equal(actual[i].epoch,parsed.getTime(),JSON.stringify(value));assert.equal(actual[i].iso,parsed.toISOString(),JSON.stringify(value));}}
});
console.log(`UTC/offset/epoch date conformance: ${inputs.length} actual source-helper cases passed; local-time and other V8 string forms remain pending`);
