// Import pure policy metadata from the local WeKan source; no network.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=path.resolve(process.argv[2]||'../../..'),file=path.join(source,'models/lib/boardViewSettings.js'),text=fs.readFileSync(file,'utf8'),policy=require(file);
const later=text.match(/const VIEWS_ADDED_LATER = (\[[\s\S]*?\]);/);
if(!later)throw Error('Source later-view metadata missing');
const data={views:policy.BOARD_VIEWS,order:policy.DEFAULT_BOARD_VIEW_ORDER,later:vm.runInNewContext(later[1],{}, {timeout:100})};
fs.writeFileSync(path.join(__dirname,'../WeKan/.public/board-views.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Imported ${data.views.length} source board view definitions`);
