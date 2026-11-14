// Derive the pinned source Node engine's normalization data, not host Python's UCD.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
let source=process.argv[2]||process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'imports/lib/fileNameDisplay.js')))source=ancestor;else ancestor=path.dirname(ancestor);}if(!source)throw Error('Original WeKan source required');
const sourceBytes=fs.readFileSync(path.join(source,'imports/lib/fileNameDisplay.js')),text=sourceBytes.toString('utf8'),literal=text.match(/const CONFUSABLES = (\{[\s\S]*?\n\});/);if(!literal)throw Error('Confusable source changed');
const confusables=require('node:vm').runInNewContext('('+literal[1]+')');
const nfkd={},compose={},marks=[],high='\u0345',low='\u0334';
for(let cp=0;cp<=0x10FFFF;cp++){
 if(cp>=0xD800&&cp<=0xDFFF)continue;
 const char=String.fromCodePoint(cp),kd=char.normalize('NFKD'),d=char.normalize('NFD');
 if(kd!==char)nfkd[cp]=Array.from(kd,c=>c.codePointAt(0));
 if(d===char){const probe=('A'+high+char+low).normalize('NFD');if(probe.indexOf(low)<probe.indexOf(high))marks.push(char);}
 else if(d.normalize('NFC')===char){const parts=Array.from(d),last=parts.pop(),prefix=parts.join('').normalize('NFC');if(Array.from(prefix).length!==1)throw Error('Unexpected canonical prefix');compose[prefix.codePointAt(0)+','+last.codePointAt(0)]=cp;}
}
function compare(a,b){if(a===b)return 0;const ab='A'+a+b,ba='A'+b+a,orderedAB=ab.normalize('NFD')===ab,orderedBA=ba.normalize('NFD')===ba;if(orderedAB&&orderedBA)return 0;if(orderedAB)return-1;if(orderedBA)return 1;throw Error('Non-terminal combining mark');}
marks.sort(compare);const ranks={};let rank=0,previous;for(const mark of marks){if(previous===undefined||compare(previous,mark)!==0)rank++;ranks[mark.codePointAt(0)]=rank;previous=mark;}
const data={unicode:process.versions.unicode,nfkd,compose,ranks,confusables},encoded=zlib.gzipSync(Buffer.from(JSON.stringify(data))),root=path.resolve(__dirname,'..'),out=path.join(root,'runtime/filename-data');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'normalization.json.gz'),encoded);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({node:process.versions.node,unicode:process.versions.unicode,sourceFile:'imports/lib/fileNameDisplay.js',sourceSha256:sha(sourceBytes),dataSha256:sha(encoded),decompositions:Object.keys(nfkd).length,compositions:Object.keys(compose).length,nonstarters:marks.length,orderingClasses:rank},null,2)+'\n');
const license=fs.readFileSync(path.join(path.dirname(process.execPath),'../LICENSE'),'utf8'),start=license.indexOf('    UNICODE LICENSE V3'),end=license.indexOf('    ----------------------------------------------------------------------',start);if(start<0||end<0)throw Error('Node Unicode license required');fs.writeFileSync(path.join(out,'LICENSE-Unicode.txt'),license.slice(start,end).replace(/^    /gm,''));
console.log('Imported source Unicode '+data.unicode+': '+Object.keys(nfkd).length+' decompositions, '+Object.keys(compose).length+' compositions, '+marks.length+' nonstarters in '+rank+' ordering classes');
