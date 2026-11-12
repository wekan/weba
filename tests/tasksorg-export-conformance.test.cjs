// Rich native backup versus the actual parent formatter; timestamps are the
// explicit source fallback for native cards without creation timestamps.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/tasksorgFormat.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Parent Tasks.org source required');
 const data=JSON.parse(execFileSync(process.env.GBX,['-s','TasksOrgExportTest',process.env.WEBA_TEST_TASKSORG_PROJECT],{encoding:'utf8',env:process.env})),actual=JSON.parse(data.actual),{formatTasksOrgBackup}=await import(pathToFileURL(path.join(source,'models/lib/tasksorgFormat.js')).href);
 const expected=JSON.parse(JSON.stringify(formatTasksOrgBackup({board:data.board,lists:data.lists,items:data.items},new Date(actual.timestamp))));assert.deepEqual(actual,expected);assert.ok(data.actual.endsWith('\n'));assert.ok(!data.actual.includes('Hidden archived content'));assert.ok(actual.data.tasks.some(row=>row.task.estimatedSeconds===null));
 console.log('Tasks.org native conformance: rich backup equals unchanged parent formatter for native numeric IDs, duplicate/empty calendars, Unicode/astral tag IDs and deduplication, all-day/timed/pre-epoch dates, filtered/undated comments, indexed checklist subtasks/completion fallbacks, same-list/cross-list hierarchy, stopped hours/running exclusion, exact/overflow estimates and archive/scope/policy refusal; absent native creation dates use explicit source export-time fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
