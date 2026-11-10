'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'client/components/boards/boardsList.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original Home presentation source required');
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-home-presentation.'));
try{
 const searches=['',' ','\t\r\n','\u00a0\u2003\ufeff','Alpha',' \u2003Alpha ','\u0085','\u200b'];
 const cases=[];for(const ids of [[],[0],[1],[1,0],[0,1,0],[1,1]])for(const search of searches)cases.push({ids,search});
 for(const name of ['.src','.public'])fs.cpSync(path.join(root,'WeKan',name),path.join(work,name),{recursive:true});fs.copyFileSync(path.join(root,'WeKan/.project'),path.join(work,'.project'));fs.copyFileSync(path.join(__dirname,'HomePresentationMatrix.module'),path.join(work,'.src/HomePresentationMatrix.module'));fs.writeFileSync(path.join(work,'.public/home-presentation-cases.json'),JSON.stringify(cases));
 execFileSync(process.env.GBC||'gbc3',['-j','1','-a',work],{stdio:'inherit'});const data=JSON.parse(execFileSync(process.env.GBX||'gbx3',['-s','HomePresentationMatrix',work],{encoding:'utf8',env:{...process.env,WEBA_API_REQUEST:'0',WEBA_DB_TYPE:'sqlite3',WEBA_DB_HOST:work,WEBA_DB_NAME:'database.db',WEBA_DB_USER:'',WEBA_DB_PASSWORD:''}}));
 const raw=fs.readFileSync(path.join(source,'client/components/boards/boardsList.js'),'utf8'),signature='  const withHomeFirst = (arr) => {',start=raw.indexOf(signature),end=raw.indexOf('\n  };',start);assert.ok(start>=0&&end>start);
 let total=0;
 for(const row of data.rows)for(const item of row.cases){
  // Explicit SQL numeric-ID/private-cache adapter; cache access comes from raw rows.
  const readable=board=>!row.removed.some(m=>m.board_id===board.id&&m.username===row.actor)&&(board.owner===row.actor||row.members.some(m=>m.board_id===board.id&&m.username===row.actor&&m.role==='read-only'));
  const original=vm.runInNewContext('(arr)=>{'+raw.slice(start+signature.length,end)+'\n}',{
   tpl:{selectedMenu:{get:()=> 'starred'},boardSearchVar:{get:()=>item.search}},currentUser:{getDefaultBoardId:()=>row.saved||null},
   ReactiveCache:{getBoard:id=>{const b=row.boards.find(b=>b.id===id&&readable(b));return b?{_id:b.id,archived:b.archived}:null;}}
  });
  const expected=original(item.ids.map(id=>({_id:id}))).map(b=>b._id);assert.deepEqual(item.actual,Array.from(expected),row.state+' '+JSON.stringify(item));total++;
 }
 console.log('Home presentation conformance: '+total+' native projections match unchanged source withHomeFirst across empty/repeated/paged IDs, Unicode search whitespace, active/archive/revoked/foreign/missing marks; SQL cache/ID adapters explicit, input and stored stars/ranks/history unchanged');
}finally{fs.rmSync(work,{recursive:true,force:true});}
