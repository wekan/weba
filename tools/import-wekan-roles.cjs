// Snapshot the authoritative pure role matrix; no translated/user data is changed.
const fs=require('node:fs');
const path=require('node:path');
if(!process.argv[2])throw Error('Usage: node tools/import-wekan-roles.cjs /path/to/wekan');
const source=path.resolve(process.argv[2],'models/lib/boardRoleCapabilities.js');
const {ROLE_CAPABILITIES}=require(source);
fs.writeFileSync(path.join(__dirname,'../WeKan/.public/board-roles.json'),JSON.stringify(ROLE_CAPABILITIES,null,2)+'\n');
console.log('Imported '+Object.keys(ROLE_CAPABILITIES).length+' WeKan role capability definitions');
