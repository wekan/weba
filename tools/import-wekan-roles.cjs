// Snapshot the authoritative pure role matrix; no translated/user data is changed.
const fs=require('node:fs');
const path=require('node:path');
if(!process.argv[2])throw Error('Usage: node tools/import-wekan-roles.cjs /path/to/wekan');
const source=path.resolve(process.argv[2],'models/lib/boardRoleCapabilities.js');
const {ROLE_CAPABILITIES,BOARD_ROLES,ROLE_FLAGS}=require(source);
const utils=fs.readFileSync(path.resolve(process.argv[2],'server/lib/utils.js'),'utf8');
const memberFunction=utils.slice(utils.indexOf('export function boardMemberRoleToFlags('));
const match=memberFunction.match(/const roleMap = (\{[\s\S]*?\n  \});/);
if(!match)throw Error('Cannot read WeKan member role aliases');
const roleMap=require('node:vm').runInNewContext('('+match[1]+')');
const aliases={normal:'normal',member:'normal'};
for(const [alias,flag] of Object.entries(roleMap)){
 const role=BOARD_ROLES.find(role=>ROLE_FLAGS[role]===flag);
 if(!role)throw Error('Unknown role flag '+flag);
 aliases[alias]=role;
}
const api={roles:BOARD_ROLES.map(role=>({role,flag:ROLE_FLAGS[role]||''})),aliases};
fs.writeFileSync(path.join(__dirname,'../WeKan/.public/api-member-roles.json'),JSON.stringify(api,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'../WeKan/.public/board-roles.json'),JSON.stringify(ROLE_CAPABILITIES,null,2)+'\n');
console.log('Imported '+Object.keys(ROLE_CAPABILITIES).length+' WeKan role capability definitions');
