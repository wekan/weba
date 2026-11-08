const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const actual=require('../WeKan/.public/board-roles.json');
let ancestor=path.resolve(__dirname,'..');
let compared=false;
while(path.dirname(ancestor)!==ancestor){
 const source=path.join(ancestor,'models/lib/boardRoleCapabilities.js');
 if(fs.existsSync(source)){
  assert.deepEqual(actual,require(source).ROLE_CAPABILITIES,'webas snapshot must match current WeKan role capabilities');
  compared=true;break;
 }
 ancestor=path.dirname(ancestor);
}
assert.equal(Object.keys(actual).length,9);
console.log('Role capability snapshot validated'+(compared?' against the current parent WeKan source':''));
