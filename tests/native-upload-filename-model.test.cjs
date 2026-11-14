'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'imports/lib/fileNameDisplay.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
assert.ok(source);
const original=require('./native-upload-filename-source.cjs')(source),correctionSource=require('./upload-filename-source.cjs')(source);
const names=['','.', '..','dir\\name%20<literal>.txt','../a.txt','%2e%2e%2fdoc.pdf','\0suffixΩ.txt','ＡＢＣ.ﬁ','pаypal.exe','각각.txt','😀'.repeat(40)+'.pdf','x'.repeat(35)+' (copy).pdf','<script>x</script>.txt','\ud800x.txt','a/b/','$(false).txt','nested%2520name.txt'];
const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-native-name-oracle.'));
try{
  const project=process.env.WEBA_NATIVE_FILENAME_PROJECT,scriptPath=path.join(project,'.public/native-filename-policy.py'),script=fs.readFileSync(scriptPath,'utf8'),trace=path.join(work,'protocol.json');
  const execute=(file,key='WEBA_NATIVE_FILENAME_CASES')=>JSON.parse(execFileSync(process.env.GBX,['-s','NativeFileNameTest',project],{encoding:'utf8',timeout:15000,env:{...process.env,[key]:file}}));
  const tracePrefix=()=>`import sys,json,atexit
class _WebaTraceReader:
    def __init__(self,stream): self.stream=stream; self.parts=[]
    def read(self,size=-1):
        value=self.stream.read(size); self.parts.append(value); return value
    def readline(self,size=-1):
        value=self.stream.readline(size); self.parts.append(value); return value
_weba_trace_reader=_WebaTraceReader(sys.stdin.buffer)
sys.stdin=type('_WebaTraceInput',(),{'buffer':_weba_trace_reader})()
atexit.register(lambda:open(${JSON.stringify(trace)},'w').write(json.dumps({'argv':sys.argv,'stdin':b''.join(_weba_trace_reader.parts).decode()})))
`;
  const readRequest=()=>{const record=JSON.parse(fs.readFileSync(trace,'utf8')),newline=record.stdin.indexOf('\n'),body=record.stdin.slice(newline+1);assert.equal(Buffer.byteLength(body),Number(record.stdin.slice(0,newline)));return {record,request:JSON.parse(body)};};
  const assertPrivate=(record,text)=>assert.ok(record.argv.every(arg=>!arg.includes(text)&&!arg.includes(Buffer.from(text).toString('base64'))),'private value leaked into worker arguments');
  const file=path.join(work,'names.json');fs.writeFileSync(file,JSON.stringify(names));assert.deepEqual(execute(file),names.map(original));
  const privateName='PIPE_PRIVATE_Ω_marker.txt',privateFile=path.join(work,'private.json');fs.writeFileSync(privateFile,JSON.stringify([privateName]));
  try{fs.writeFileSync(scriptPath,tracePrefix()+script);assert.deepEqual(execute(privateFile),[original(privateName)]);const {record,request}=readRequest();assertPrivate(record,privateName);assert.equal(Buffer.from(request.filename,'base64').toString(),privateName);}finally{fs.writeFileSync(scriptPath,script);}
  const correctionFile=path.join(work,'correction.json'),correctionRows=[];
  for(const name of ['', 'wrong.txt', 'photo.jfif', 'schedule.gantt', 'a/b.txt/', '/..txt', 'Ａ%20😀'.repeat(20)+'.pdf', '\0x.svg'])for(const type of ['image/png','image/jpeg','application/json','application/octet-stream','text/plain; charset=utf-8'])correctionRows.push([name,type]);
  correctionRows.push(['x'.repeat(4096),'x'.repeat(1024)]);fs.writeFileSync(correctionFile,JSON.stringify(correctionRows));const expectedCorrections=correctionRows.map(([name,type])=>correctionSource.sanitizeUploadFileName(name,type));assert.deepEqual(execute(correctionFile,'WEBA_NATIVE_CORRECTION_CASES'),expectedCorrections);
  try{const privateMime='image/png; PRIVATE_MIME_\0Ω_marker';fs.writeFileSync(correctionFile,JSON.stringify([[privateName,privateMime]]));fs.writeFileSync(scriptPath,tracePrefix()+script);assert.deepEqual(execute(correctionFile,'WEBA_NATIVE_CORRECTION_CASES'),[correctionSource.sanitizeUploadFileName(privateName,privateMime)]);const {record,request}=readRequest();for(const text of [privateName,privateMime])assertPrivate(record,text);assert.equal(Buffer.from(request.mime,'base64').toString(),privateMime);assert.equal(Buffer.from(request.filename,'base64').toString(),privateName);}finally{fs.writeFileSync(scriptPath,script);}
  for(const row of [['x'.repeat(4097),'image/png'],['valid.txt','x'.repeat(1025)]]){try{fs.rmSync(trace,{force:true});fs.writeFileSync(scriptPath,'open('+JSON.stringify(trace)+',"w").write("started")\n'+script);fs.writeFileSync(correctionFile,JSON.stringify([row]));const result=spawnSync(process.env.GBX,['-s','NativeFileNameTest',project],{encoding:'utf8',timeout:10000,env:{...process.env,WEBA_NATIVE_CORRECTION_CASES:correctionFile}});assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/Filename normalization failed/);assert.ok(!fs.existsSync(trace),'oversized private input started worker');}finally{fs.writeFileSync(scriptPath,script);}}
  for(const [label,body] of [
    ['malformed','print("not-json")'],
    ['oversized','print("x"*100000)'],
    ['ack-flood','print(chr(30)*100000,flush=True)'],
    ['stderr','import sys;sys.stderr.write("PRIVATE_WORKER_ERROR");sys.stderr.flush()'],
    ['timeout','import time;time.sleep(30)'],
    ['closed-stdout-timeout','import os,time;os.close(1);time.sleep(30)'],
    ['closed-stderr-timeout','import os,time;os.close(2);time.sleep(30)'],
    ['nonzero','raise SystemExit(7)']
  ]){try{fs.writeFileSync(scriptPath,'import os\nopen('+JSON.stringify(trace)+',"w").write(str(os.getpid()))\n'+body+'\n');const started=Date.now(),result=spawnSync(process.env.GBX,['-s','NativeFileNameTest',project],{encoding:'utf8',timeout:10000,env:{...process.env,WEBA_NATIVE_FILENAME_CASES:privateFile}});assert.equal(result.error,undefined,label);assert.notEqual(result.status,0,label);assert.match(result.stderr,/Filename normalization failed/,label);assert.ok(!(result.stdout+result.stderr).includes(privateName),label);assert.ok(!(result.stdout+result.stderr).includes('PRIVATE_WORKER_ERROR'),label);assert.ok(Date.now()-started<6000,label);const pid=Number(fs.readFileSync(trace,'utf8'));assert.throws(()=>process.kill(pid,0),{code:'ESRCH'},label+' worker was not reaped');}finally{fs.writeFileSync(scriptPath,script);}}
  assert.deepEqual(execute(privateFile),[original(privateName)]);
  fs.writeFileSync(correctionFile,JSON.stringify(correctionRows));const archive=path.join(work,'native-filename.gambas');execFileSync(process.env.GBA||'gba3',['-o',archive,project],{encoding:'utf8'});assert.deepEqual(JSON.parse(execFileSync(process.env.GBR||'gbr3',['-s','NativeFileNameTest',archive],{encoding:'utf8',timeout:15000,env:{...process.env,WEBA_NATIVE_CORRECTION_CASES:correctionFile}})),expectedCorrections);
  console.log('Native Gambas filename bridge: '+names.length+' exact source names; private framed stdin, malformed/oversized/ack-flood/stderr/nonzero/timeout cleanup and retry; '+correctionRows.length+' source/packaged MIME correction rows, private NUL/Unicode MIME transport and input boundaries passed');
  require('./native-filename-pipe.test.cjs');
  require('./native-mime-model.test.cjs')();
}finally{fs.rmSync(work,{recursive:true,force:true});}
