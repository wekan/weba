'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/dragHandles.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
assert.ok(source,'WeKan source required');
const oracle=require(path.join(source,'models/lib/dragHandles.js'));
const stored=[true,false,null,'true','false','','TRUE','FALSE',' true','false ','null','0','1',0,1,-1,0.5,[],[true],{}, {showDesktopDragHandles:true}];
const cases=stored.flatMap(stored=>[false,true].map(touch=>({stored,touch})));
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-drag-handles-conformance.'));
try {
 fs.cpSync(path.join(root,'WeKan/.src'),path.join(work,'.src'),{recursive:true});
 fs.cpSync(path.join(root,'WeKan/.public'),path.join(work,'.public'),{recursive:true});
 fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
 fs.copyFileSync(path.join(__dirname,'DragHandlesConformance.module'),path.join(work,'.src/DragHandlesConformance.module'));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work]);
 const actual=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','DragHandlesConformance',work],{encoding:'utf8',env:{...process.env,WEBA_DRAG_HANDLE_CASES:JSON.stringify(cases)}}));
 assert.deepEqual(actual,cases.map(row=>({read:oracle.readDragHandlesPreference(row.stored),resolve:oracle.resolveShowDragHandles(row.stored,row.touch),effective:oracle.resolveShowDragHandles(oracle.readDragHandlesPreference(row.stored),row.touch)})));
 console.log(`Drag handle source conformance: ${cases.length} native three-state normalization, raw resolution and effective results match unchanged source; explicit false wins on touch; malformed values default by device`);
} finally {fs.rmSync(work,{recursive:true,force:true});}
