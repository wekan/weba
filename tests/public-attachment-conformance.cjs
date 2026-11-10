// Unchanged universal file-server authorization and assigned-file helper bodies.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async({source,fixture,id,card,file,signed,guest,url,expect})=>{
 const raw=fs.readFileSync(path.join(source,'server/routes/universalFileServer.js'),'utf8'),helpers=fs.readFileSync(path.join(source,'server/lib/assignedOnlyAttachments.js'),'utf8');
 const start=raw.indexOf('  async function isAuthorizedForBoard('),end=raw.indexOf('\n  }',start);expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
 const body=(start)=>{const at=helpers.indexOf(start),end=helpers.indexOf('\n}',at);expect(at).toBeGreaterThan(0);expect(end).toBeGreaterThan(at);return helpers.slice(at,end+2).replace(/^export /,'');};
 const code="const BOARD_LEVEL_SOURCES=new Set(['board-background','api-background','board-map']);\n"+body('export function isBoardLevelFile(')+'\n'+body('export async function mayReadBoardAttachment(')+'\n'+raw.slice(start,end+4)+'\nisAuthorizedForBoard';
 const scope=require(path.join(source,'models/lib/boardCardScope.js')),roles=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../WeKan/.public/api-member-roles.json'),'utf8')).roles;
 let count=0;
 for(const retained of [false,true]){
  if(retained)fixture('attachments-delete',id,{WEBA_PUBLIC_CARD:String(card),WEBA_PUBLIC_FILE:String(file)});
  for(const role of ['normal','read-only','normal-assigned-only','comment-assigned-only','read-assigned-only','board-admin','unknown','removed'])for(const rawFlag of [false,true])for(const assigned of [false,true]){
   fixture('attachments-frame',id,{WEBA_PUBLIC_CARD:String(card),WEBA_PUBLIC_ROLE:role==='removed'?'read-assigned-only':role,WEBA_PUBLIC_RAW:rawFlag?'1':'0',WEBA_PUBLIC_REMOVED:role==='removed'?'1':'0',WEBA_PUBLIC_ASSIGNED:assigned?'1':'0'});
   const member={userId:'rest-member',isActive:role!=='removed'};for(const item of roles)if(item.flag)member[item.flag]=item.role===role;if(rawFlag)member.isReadAssignedOnly=true;
   const board={_id:String(id),permission:'public',members:[member],isVisibleBy:()=>true};
   const ctx={process:{env:{}},isSandstormRequest:()=>false,extractLoginToken:()=> 'ui-principal-adapter',getUserFromToken:async()=>({_id:'rest-member',isAdmin:false}),canReadBoard:()=>true,isAssignedOnlyMember:scope.isAssignedOnlyMember,ReactiveCache:{getCard:async()=>({_id:String(card),boardId:String(id),assignees:assigned?['rest-member']:[]})},require:()=>({record(){}})};
   const authorize=vm.runInNewContext(code,ctx),expected=await authorize({},board,{_id:String(file),meta:{boardId:String(id),cardId:String(card)}},'file-server:cdn');
   expect((await signed.request.get(url)).status(),`${role}/${rawFlag}/${assigned}/${retained}`).toBe(expected?200:404);expect((await guest.request.get(url)).status()).toBe(200);count++;
  }
 }
 console.log(`Public attachment source conformance: ${count} signed and anonymous native HTTP outcomes match unchanged universal isAuthorizedForBoard/mayReadBoardAttachment bodies across roles/raw flags/assignment/removal and live/retained files; UI-cookie-to-source-token, SQL numeric IDs/public board, no-op logger and in-memory source cache adapters explicit; full source storage/Sandstorm/eventlog integration remains pending`);
};
