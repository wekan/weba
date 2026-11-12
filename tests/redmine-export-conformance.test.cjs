// Exact rich native CSV versus the actual parent Redmine formatter.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/redmineCsvFormat.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Parent Redmine source required');
 const output=execFileSync(process.env.GBX,['-s','RedmineExportTest',process.env.WEBA_TEST_REDMINE_PROJECT],{encoding:'utf8',env:process.env}).trim(),data=JSON.parse(output),{formatRedmineCsv}=await import(pathToFileURL(path.join(source,'models/lib/redmineCsvFormat.js')).href);
 assert.equal(data.actual,formatRedmineCsv({items:data.items}));assert.equal(Buffer.from(data.actual).subarray(0,3).toString('hex'),'efbbbf');assert.ok(data.actual.endsWith('\r\n'));assert.ok(!data.actual.includes('Hidden archived bytes'));
 console.log('Redmine native conformance: exact rich CSV equals unchanged parent formatter for native IDs/text/project/assignee/dates, reserved and case-sensitive extra fields, stopped hours/running exclusion, reciprocal related links/scoped parent, archived omission, binary rounding/ties/negative zero and invalid decimal values; native missing creation/requester and untyped relation adapters explicit');
})().catch(error=>{console.error(error);process.exitCode=1;});
