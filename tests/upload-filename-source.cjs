'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=source=>{const req=createRequire(path.join(source,'package.json')),code=fs.readFileSync(path.join(source,'models/lib/uploadFileName.js'),'utf8'),module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:id=>id==='/imports/lib/fileNameDisplay'?req(path.join(source,'imports/lib/fileNameDisplay.js')):req(id)});return module.exports;};
