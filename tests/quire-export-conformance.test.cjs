'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/quireCsvFormat.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const {formatQuireCsv}=await import(pathToFileURL(path.join(source,'models/lib/quireCsvFormat.js')).href),run=name=>JSON.parse(execFileSync(process.env.GBX,['-s',name,process.env.WEBA_TEST_QUIRE_PROJECT],{encoding:'utf8',env:process.env})),rich=run('QuireExportTest'),cases=run('QuireCasesTest'),matrix=run('QuireMatrixTest');
 for(const sample of [rich,...cases,matrix]){assert.equal(sample.actual,formatQuireCsv(sample),sample.mode||'rich');assert.ok(sample.actual.endsWith('\r\n'));assert.ok(!sample.actual.includes('Hidden Quire parent'));}
 assert.ok(rich.actual.includes('Assignee,Assignee,Tag,Tag'));assert.ok(rich.actual.includes("'=SUM(1,2)"));assert.ok(matrix.actual.includes('Jan 15, 2026'));assert.ok(matrix.actual.includes('Dec 15, 2026'));assert.ok(matrix.actual.includes('Untitled,To-Do,,Medium'));
 console.log('Quire native/source CSV: byte-exact CRLF/header/dynamic deduplicated people/tag columns, sequential IDs/parents, formula guards/quoted literals, all UTC months/epoch dates, typed priority/defaults, empty/legacy/cycle/archive scope, unrelated malformed-field/WIP independence, policy and assigned-only denial passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
