// Execute actual native policy results against unchanged current source helpers.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/boardPermission.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Original visibility source required');
 const req=createRequire(path.join(source,'package.json')),permission=req(path.join(source,'models/lib/boardPermission.js')),roles=req(path.join(source,'models/lib/boardRoleCapabilities.js'));
 const actual=JSON.parse(execFileSync(process.env.GBX,['-s','BoardVisibilityMatrix',process.env.WEBA_TEST_VISIBILITY_PROJECT],{encoding:'utf8',env:process.env}));
 const scope={require:name=>{assert.equal(name,'/models/lib/boardPermission');return permission;},TableVisibilityModeSettings:{findOneAsync:async()=>({booleanValue:scope.privateOnly})}};
 vm.runInNewContext(fs.readFileSync(path.join(source,'server/lib/boardVisibilityPolicy.js'),'utf8').replace(/^import .*;\s*$/gm,'').replace('export async function','async function')+'\nthis.underPolicy=boardPermissionUnderPolicy;',scope);
 for(const row of actual.readable){assert.equal(row.readable,permission.readableWithoutMembership(row.permission,!!row.signedIn));assert.equal(row.open,permission.isOpenPermission(row.permission));}
 for(const row of actual.editing){roles.setInstanceEditingLookup(()=>row.globalAllows);assert.equal(row.editable,roles.instanceEditable({permission:row.permission,archived:row.archived,allowsInstanceEditing:row.boardAllows}));}
 for(const row of actual.imports){scope.privateOnly=!!row.privateOnly;assert.equal(row.stored,await scope.underPolicy(row.permission));}
 assert.equal(actual.readable.length,12);assert.equal(actual.editing.length,750);assert.equal(actual.imports.length,12);
 console.log('Visibility policy conformance: 12 read/open, 750 strict editing and 12 private-only import outcomes match unchanged boardPermission, instanceEditable and boardPermissionUnderPolicy; ACL, join-on-edit, UI and original transport integration remain pending');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
