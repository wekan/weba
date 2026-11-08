const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const actual=require('../WeKan/.public/board-roles.json');
const api=require('../WeKan/.public/api-member-roles.json');
let ancestor=path.resolve(__dirname,'..');
let compared=false;
while(path.dirname(ancestor)!==ancestor){
 const source=path.join(ancestor,'models/lib/boardRoleCapabilities.js');
 if(fs.existsSync(source)){
  const caps=require(source);
  assert.deepEqual(actual,caps.ROLE_CAPABILITIES,'webas snapshot must match current WeKan role capabilities');
  assert.deepEqual(api.roles,caps.BOARD_ROLES.map(role=>({role,flag:caps.ROLE_FLAGS[role]||''})), 'member flag precedence must match WeKan');
  const utils=fs.readFileSync(path.join(ancestor,'server/lib/utils.js'),'utf8');
  const fn=utils.match(/export function boardMemberRoleToFlags\(role\) \{[\s\S]*?^\}/m)[0].replace('export ','');
  const parse=require('node:vm').runInNewContext('('+fn+')',{BOARD_MEMBER_ROLE_FLAGS:Object.values(caps.ROLE_FLAGS)});
  for(const [alias,role] of Object.entries(api.aliases))assert.deepEqual(JSON.parse(JSON.stringify(parse(alias))),caps.flagsForRole(role),alias);
  const roleMap=utils.slice(utils.indexOf('export function boardMemberRoleToFlags(')).match(/const roleMap = (\{[\s\S]*?\n  \});/)[1];
  const sourceAliases=Object.keys(require('node:vm').runInNewContext('('+roleMap+')'));
  assert.deepEqual(Object.keys(api.aliases).sort(),['normal','member',...sourceAliases].sort());
  compared=true;break;
 }
 ancestor=path.dirname(ancestor);
}
assert.equal(Object.keys(actual).length,9);
console.log('Role capability snapshot validated'+(compared?' against the current parent WeKan source':''));
