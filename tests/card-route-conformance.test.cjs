// Compare actual native SQL route outcomes with the unchanged source redirect helper.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/cardLinkRedirect.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source,'Original card-link source required');
const scope={};vm.runInNewContext(fs.readFileSync(path.join(source,'models/lib/cardLinkRedirect.js'),'utf8').replace(/export\s*\{[^}]*\};?/g,'')+'\nthis.redirect=cardBoardRedirectTarget;',scope);
let seed={};const fixture=mode=>JSON.parse(execFileSync(process.env.GBX,['-s','CardRouteFixture',process.env.WEBA_TEST_PROJECT],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_CARD_ROUTE_MODE:mode,WEBA_CARD_ROUTE_SEED:JSON.stringify(seed)}}));seed=fixture('seed');let cases=0;
try{
 const [a,b]=seed.boards.map(String);
 const check=(expectedBoard,archived=false)=>{const native=fixture('resolve'),target=scope.redirect(a,expectedBoard?{boardId:expectedBoard}:null);assert.equal(native.allowed,!!expectedBoard);if(expectedBoard){assert.equal(String(native.boardId),target||a);assert.equal(native.moved,!!target);assert.equal(native.cardArchived,archived);}cases++;};
 check(a);fixture('archive');check(a,true);fixture('restore');check(a);fixture('move');check(b);fixture('private');check(null);
 for(const [card,expected] of [[undefined,null],[null,null],[{},null],[{boardId:''},null],[{boardId:5},null],[{boardId:a},null],[{boardId:b},b]]){assert.equal(scope.redirect(a,card),expected);cases++;}
 console.log('Card redirect conformance: '+cases+' native SQL/pure cases match unchanged cardBoardRedirectTarget; explicit numeric-ID and readable/private fixture adapters, not production Meteor publication/FlowRouter wiring');
}finally{fixture('cleanup');}
