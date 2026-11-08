// Actual native pages vs the original method body, on independent raw SQL rows.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'server/publications/boards.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source){console.log('SKIP original All Boards method: reference checkout unavailable; source parity remains unverified');return;}
 const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-catalog-source.'));
 try{
  const cases=[];
  for(const user of ['catalog-matrix-owner','catalog-matrix-other',''])for(const params of [
   {},{page:1,perPage:10,sortBy:'title-asc'},{page:2,perPage:10,sortBy:'title-asc'},
   {page:1,perPage:10,sortBy:'title-desc'},{search:'Board 0',perPage:100},
   {search:'Secret User2 Board'},{search:'Revoked board'},{search:' .*%_ '},{search:'ångström'},
   {menu:'starred'},{menu:'starred',search:'Board 0'},{menu:'unknown-workspace'},
   {menu:'unknown-workspace',search:'Board 0'},{page:0,perPage:0},{page:1,perPage:-1},
   {page:2147483647,perPage:200},{perPage:1000},{sortBy:'custom'},
  ])cases.push({user,params});
  for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});
  fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));
  fs.copyFileSync(path.join(__dirname,'BoardCatalogMatrix.module'),path.join(work,'.src/BoardCatalogMatrix.module'));
  fs.writeFileSync(path.join(work,'.public/catalog-cases.json'),JSON.stringify(cases));
  execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});
  const input=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','BoardCatalogMatrix',work],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));
  const inactive=(id,user)=>input.removed.some(row=>row.board_id===id&&row.username===user);
  // Explicit native-schema adapter: an existing SQL owner is an implicit member.
  const boards=input.boards.map(row=>({_id:row.id,title:row.title,archived:row.archived,type:'board',permission:'private',members:[
   {userId:row.owner,isActive:!!row.owner&&!inactive(row.id,row.owner)},
   ...input.members.filter(m=>m.board_id===row.id&&m.username!==row.owner).map(m=>({userId:m.username,isActive:!inactive(row.id,m.username)})),
  ]}));
  const match=(row,selector)=>Object.entries(selector).every(([key,value])=>{
   if(key==='$or')return value.some(part=>match(row,part));
   if(key==='$and')return value.every(part=>match(row,part));
   const actual=row[key];
   if(value&&typeof value.test==='function')return value.test(actual);
   if(value&&typeof value==='object')return Object.entries(value).every(([op,want])=>{
    if(op==='$in')return want.includes(actual);
    if(op==='$nin')return !want.includes(actual);
    if(op==='$elemMatch')return Array.isArray(actual)&&actual.some(item=>match(item,want));
    throw Error('Unimplemented oracle selector '+op);
   });
   return actual===value;
  });
  const raw=fs.readFileSync(path.join(source,'server/publications/boards.js'),'utf8');
  const signature='  async getAllBoardsPage(params) {',start=raw.indexOf(signature),end=raw.indexOf('\n  },',start);
  assert.ok(start>=0&&end>start,'audit original All Boards method boundary');
  const original=vm.runInNewContext('(async function(params) {'+raw.slice(start+signature.length,end)+'\n})',{
   // Only valid source parameters are compared; negative validation is native-tested.
   check:()=>{},Match:{Optional:value=>value,ObjectIncluding:value=>value,test:(value,type)=>{assert.equal(type.name,"String");return typeof value==="string";}},
   ReactiveCache:{getUser:async user=>({orgIds:()=>[],teamIds:()=>[],emailDomains:()=>[],profile:{starredBoards:input.stars.filter(row=>row.username===user&&row.value==='1').map(row=>row.board_id)}})},
   ...require(path.join(source,'models/lib/boardVisibilitySelectors.js')),
   require:name=>{assert.equal(name,'/models/lib/allBoardsFacets');return require(path.join(source,'models/lib/allBoardsFacets.js'));},
   Boards:{find:(selector,options={})=>{
    let rows=boards.filter(row=>match(row,selector));const total=rows.length;
    if(options.sort)rows.sort((a,b)=>{for(const [key,dir] of Object.entries(options.sort)){if(a[key]<b[key])return -dir;if(a[key]>b[key])return dir;}return 0;});
    if(options.skip)rows=rows.slice(options.skip);
    if(options.limit)rows=rows.slice(0,options.limit);
    return{countAsync:async()=>total,fetchAsync:async()=>rows};
   }},
  });
  assert.equal(input.actual.length,cases.length);
  for(let index=0;index<cases.length;index++){
   const testCase=cases[index],expected=await original.call({userId:testCase.user},testCase.params);
   assert.deepEqual(input.actual[index].result,JSON.parse(JSON.stringify(expected)),'native/source case '+JSON.stringify(testCase));
  }
  console.log(`Board catalog source conformance: ${cases.length} native pages match the original getAllBoardsPage body on raw SQL inputs; direct membership, stars, literal/Unicode search, scopes, sorts and clamps covered; UI/workspaces/facets/full wire suites remain pending`);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
