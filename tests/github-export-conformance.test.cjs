'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/externalExportFormatters.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
 const format=process.env.WEBA_TEST_ISSUE_FORMAT||'github';assert.ok(['github','gitea','forgejo'].includes(format));
 const {formatters}=await import(pathToFileURL(path.join(source,'models/lib/externalExportFormatters.js')).href),run=name=>JSON.parse(execFileSync(process.env.GBX,['-s',name,process.env.WEBA_TEST_GITHUB_PROJECT],{encoding:'utf8',env:process.env})),rich=run('GithubExportTest'),samples=[rich,...run('GithubCasesTest'),...run('GithubStatesTest')];
 for(const sample of samples){assert.deepEqual(JSON.parse(sample.actual),JSON.parse(JSON.stringify(formatters[format](sample))));assert.ok(sample.actual.endsWith('\n'));assert.ok(!sample.actual.includes('HIDDEN_MONDAY_BODY'));}
 assert.ok(samples.some(sample=>JSON.parse(sample.actual).some(item=>item.state==='closed')));assert.ok(samples.some(sample=>JSON.parse(sample.actual).some(item=>item.state==='open')));
 console.log(`${format} native/source: ${samples.length} rich/empty/legacy/orphan/state outputs match unchanged formatter; ASCII substring case rules, Unicode nonmatches/labels/literal text, repeated tags, optional/pre-epoch dates, irrelevant malformed custom/WIP independence, archive exclusion, disabled export and assigned-only denial passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
