'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
module.exports=()=>{
  let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'models/lib/mimeDetection.js')))source=ancestor;else ancestor=path.dirname(ancestor);}assert.ok(source);
  const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-native-mime-model.'));
  const project=process.env.WEBA_NATIVE_FILENAME_PROJECT,scriptPath=path.join(project,'.public/native-filename-policy.py'),script=fs.readFileSync(scriptPath,'utf8'),python=execFileSync(process.env.PYTHON||'python3',['-c','import sys;print(sys.executable)'],{encoding:'utf8'}).trim();
  try{
    const file=path.join(work,'headers.json'),archive=path.join(work,'mime.gambas'),pidFile=path.join(work,'file.pid'),trace=path.join(work,'file-trace.json');
    execFileSync(process.env.GBA||'gba3',['-o',archive,project],{encoding:'utf8'});
    const run=(headers,extra={},packaged=false)=>{fs.writeFileSync(file,JSON.stringify(headers.map(b=>b.toString('base64'))));const env={...process.env,...extra,WEBA_NATIVE_MIME_CASES:file};return JSON.parse(execFileSync(packaged?(process.env.GBR||'gbr3'):process.env.GBX,['-s','NativeFileNameTest',packaged?archive:project],{encoding:'utf8',timeout:12000,env,maxBuffer:1024*1024}));};
    const expected=(headers,extra={})=>JSON.parse(execFileSync(process.env.NODE||'node',[path.join(__dirname,'native-mime-source-probe.cjs')],{encoding:'utf8',input:JSON.stringify({source,headers:headers.map(b=>b.toString('base64'))}),env:{...process.env,...extra},maxBuffer:1024*1024}));
    const headers=[Buffer.alloc(0),Buffer.from('plain text\n'),Buffer.from('{"test":true}'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'),Buffer.from('%PDF-1.7\n'),Buffer.from('GIF89a\x01\0\x01\0\x80\0\0\0\0\0\xff\xff\xff;','latin1'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'),Buffer.from([255,216,255,224,0,16,74,70,73,70,0]),Buffer.from('504b0506000000000000000000000000000000000000','hex'),Buffer.from('RIFF\x04\0\0\0WEBP','latin1'),Buffer.from(Array.from({length:70000},(_,i)=>(i*59)%256))];
    const actualExpected=expected(headers);assert.deepEqual(run(headers),actualExpected);assert.deepEqual(run(headers,{},true),actualExpected);
    const fakeFile=body=>fs.writeFileSync(path.join(work,'file'),'#!'+python+'\n'+body+'\n',{mode:0o700}),fakeEnv={PATH:work+path.delimiter+process.env.PATH};
    const privateHeader=Buffer.from(Array.from({length:70000},(_,i)=>(i*37+11)%256));
    fakeFile('import sys,json,hashlib\ndata=sys.stdin.buffer.read()\nopen('+JSON.stringify(trace)+',"w").write(json.dumps({"args":sys.argv[1:],"size":len(data),"hash":hashlib.sha256(data).hexdigest()}))\nprint("image/png")');assert.deepEqual(run([privateHeader],fakeEnv),['image/png']);assert.deepEqual(JSON.parse(fs.readFileSync(trace,'utf8')),{args:['--mime-type','-b','-'],size:65536,hash:require('node:crypto').createHash('sha256').update(privateHeader.subarray(0,65536)).digest('hex')});
    for(const [raw,status] of [['a/'+'b'.repeat(4094),0],['a/'+'b'.repeat(4095),0],['text/plain; charset=utf-8',0],['\u0085image/png',0],['text/plain',7]]){fakeFile('import sys\nsys.stdin.buffer.read()\nsys.stdout.write('+JSON.stringify(raw)+')\nraise SystemExit('+status+')');const wanted=expected([Buffer.from('private')],fakeEnv);assert.deepEqual(run([Buffer.from('private')],fakeEnv),wanted);assert.deepEqual(run([Buffer.from('private')],fakeEnv,true),wanted);}
    for(const body of ['import time;time.sleep(30)','import sys;sys.stdout.write("x"*100000);sys.stdout.flush()','import sys;sys.stderr.write("PRIVATE_MIME_DIAGNOSTIC"*10000);sys.stderr.flush()']){fakeFile('import os\nopen('+JSON.stringify(pidFile)+',"w").write(str(os.getpid()))\n'+body);const started=Date.now();assert.deepEqual(run([privateHeader],fakeEnv),[null]);assert.ok(Date.now()-started<5000);assert.throws(()=>process.kill(Number(fs.readFileSync(pidFile,'utf8')),0),{code:'ESRCH'});}
    const missing=path.join(work,'missing');fs.mkdirSync(missing);fs.symlinkSync(python,path.join(missing,'python3'));assert.deepEqual(run([Buffer.from('private')],{PATH:missing}),[null]);
    fs.writeFileSync(file,JSON.stringify([Buffer.from('PRIVATE_HEADER_MARKER').toString('base64')]));
    for(const reply of [false,42,{},[],'noslash','IMAGE/PNG','image/png;parameter','/png','image/','image/x/y']){
      // Emit the JSON fixture as data; never evaluate private request content.
      fs.writeFileSync(scriptPath,script.replace('_request = json.loads(_input)',
        '_request = json.loads(_input)\nif _request.get("mode") == "detect":\n    print('+JSON.stringify(JSON.stringify(reply))+')\n    sys.exit(0)'));
      const result=spawnSync(process.env.GBX,['-s','NativeFileNameTest',project],{encoding:'utf8',timeout:8000,env:{...process.env,WEBA_NATIVE_MIME_CASES:file}});assert.equal(result.error,undefined);assert.notEqual(result.status,0,JSON.stringify(reply));assert.match(result.stderr,/Filename normalization failed/);assert.ok(!(result.stdout+result.stderr).includes('PRIVATE_HEADER_MARKER'));
    }
    fs.writeFileSync(scriptPath,script);assert.deepEqual(run(headers),actualExpected);
    console.log('Native MIME project/archive: exact unchanged nativeMime results, 64KiB private header/hash/args, full 4096-byte MIME replies, null failure/overflow/timeout/missing-file cleanup, typed-reply refusal and valid retry passed; primary/portable/upload integration remains pending');
  }finally{fs.writeFileSync(scriptPath,script);fs.rmSync(work,{recursive:true,force:true});}
};
