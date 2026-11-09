'use strict';
// Execute the unchanged source clone callback with explicit native-ID, cache,
// method-result, Session, subscription and router adapters. This is contract
// evidence, not a Meteor subscription or URL-routing integration test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=async function(source,boards,sourceId,copied,withoutCards){
 const text=fs.readFileSync(path.join(source,'client/components/boards/boardsList.js'),'utf8'),signature="  'submit .js-clone-board-form'(evt) {",start=text.indexOf(signature),end=text.indexOf('\n  },',start);
 assert.ok(start>=0&&end>start,'Original clone callback unavailable');
 const model=fs.readFileSync(path.join(source,'models/boards.js'),'utf8'),uniqueSignature='Boards.uniqueTitle = async title => {',us=model.indexOf(uniqueSignature),ue=model.indexOf('\n};',us);
 assert.ok(us>=0&&ue>us,'Original uniqueTitle unavailable');
 const board=boards.find(b=>String(b.id)===String(sourceId));assert.ok(board);
 const unique=vm.runInNewContext('(async function(title){'+model.slice(us+uniqueSignature.length,ue)+'\n})',{
  escapeForRegex:value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),
  ReactiveCache:{getBoards:async query=>boards.filter(b=>query.title.test(b.title))}
 });
 assert.equal(copied.title,await unique(board.title));
 let pending;const events=[],getSlug=createRequire(path.join(source,'package.json'))('limax');
 const submit=vm.runInNewContext('(function(evt){'+text.slice(start+signature.length,end)+'\n})',{
  getSlug,console:{error:error=>{throw error;}},
  ReactiveCache:{getBoard:id=>String(id)===String(sourceId)?board:null,getBoards:()=>boards.filter(b=>!b.archived)},
  Meteor:{call:(name,id,options,callback)=>{
   assert.equal(name,'copyBoard');assert.equal(String(id),String(sourceId));
   assert.equal(options.title,board.title);assert.equal(options.type,'board');assert.equal(options.withoutCards,withoutCards);
   assert.equal(options.sort,boards.filter(b=>!b.archived).length);
   pending=callback;
  },subscribe:(...args)=>events.push(['subscribe',...args])},
  Session:{set:(...args)=>events.push(['session',...args])},
  FlowRouter:{go:(name,args)=>events.push(['route',name,args.id,args.slug])},Popup:{back:()=>events.push(['back'])}
 });
 submit.call({_id:String(sourceId)},{preventDefault(){},currentTarget:{querySelector:selector=>{assert.equal(selector,'.js-clone-board-without-cards');return {checked:withoutCards};}}});
 assert.deepEqual(events,[['back']]);assert.equal(typeof pending,'function');
 // Deliver the method result after submit returns, as Meteor does.
 pending(null,String(copied.id));
 assert.deepEqual(events,[['back'],['session','fromBoard',null],['subscribe','board',String(copied.id),false],['route','board',String(copied.id),getSlug(board.title)||'cloned-board']]);
};
