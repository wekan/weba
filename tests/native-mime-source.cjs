'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=source=>{const module={exports:{}},require=createRequire(path.join(source,'package.json'));vm.runInNewContext(fs.readFileSync(path.join(source,'models/lib/mimeDetection.js'),'utf8')+'\nmodule.exports.nativeMimeForTest=nativeMime;',{module,exports:module.exports,require,process,Buffer});return module.exports.nativeMimeForTest;};
