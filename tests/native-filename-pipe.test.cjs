'use strict';
// Inject probe entry points only into a disposable project, never production.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync,spawnSync}=require('node:child_process');
const work=fs.mkdtempSync(path.join(process.env.TMPDIR,'weba-private-pipe.'));
try{
  const project=path.join(work,'project');fs.mkdirSync(project);
  for(const name of ['.src','.public','.project'])fs.cpSync(path.join(process.env.WEBA_NATIVE_FILENAME_PROJECT,name),path.join(project,name),{recursive:true});
  fs.appendFileSync(path.join(project,'.src/NativeFileNames.module'),'\nPublic Function ProbeExchange(payload As String) As Variant\n  Return Exchange(payload)\nEnd\n');
  fs.writeFileSync(path.join(project,'.src/NativePipeProbe.module'),'Public Sub Main()\n  Print JsonText.Encode(NativeFileNames.ProbeExchange(File.Load(Env["WEBA_PIPE_CASE"])))\nEnd\n');
  execFileSync(process.env.GBC||'gbc3',['-j','1','-a',project],{encoding:'utf8'});
  const scriptPath=path.join(project,'.public/native-filename-policy.py'),original=fs.readFileSync(scriptPath,'utf8'),bytes=Buffer.from(Array.from({length:65536},(_,i)=>(i*37+11)%256)),marker='PRIVATE_PIPE_\0Ω',request={mode:'pipe-probe',header:bytes.toString('base64'),marker,padding:''},file=path.join(work,'payload.json'),pidFile=path.join(work,'worker.pid'),smallPipe='import fcntl\nfcntl.fcntl(0,fcntl.F_SETPIPE_SZ,4096)\n';
  request.padding='x'.repeat(98304-Buffer.byteLength(JSON.stringify(request)));const payload=JSON.stringify(request);assert.equal(Buffer.byteLength(payload),98304);fs.writeFileSync(file,payload);
  const expected={length:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),marker};
  const probe=smallPipe+original.replace('_request = json.loads(_input)',`_request = json.loads(_input)
if _request.get('mode') == 'pipe-probe':
    import hashlib
    _probe_bytes=base64.b64decode(_request['header'],validate=True)
    print(json.dumps({'length':len(_probe_bytes),'sha256':hashlib.sha256(_probe_bytes).hexdigest(),'marker':_request['marker']},ensure_ascii=True))
    sys.exit(0)`);
  fs.writeFileSync(scriptPath,probe);
  const env={...process.env,WEBA_PIPE_CASE:file},args=['-s','NativePipeProbe',project];
  assert.deepEqual(JSON.parse(execFileSync(process.env.GBX,args,{encoding:'utf8',timeout:10000,env})),expected);
  const archive=path.join(work,'pipe.gambas');execFileSync(process.env.GBA||'gba3',['-o',archive,project],{encoding:'utf8'});
  assert.deepEqual(JSON.parse(execFileSync(process.env.GBR||'gbr3',['-s','NativePipeProbe',archive],{encoding:'utf8',timeout:10000,env})),expected);
  for(const consumeFirst of [false,true,'prefill']){
    const fixture=smallPipe+`import os,sys,time
open(${JSON.stringify(pidFile)},'w').write(str(os.getpid()))
`+(consumeFirst==='prefill'?'sys.stdout.write(chr(30)*49);sys.stdout.flush()\n':
      'sys.stdout.write(chr(30));sys.stdout.flush()\nsys.stdin.buffer.readline(16)\n'+
      (consumeFirst?'sys.stdin.buffer.read(2048)\nsys.stdout.write(chr(30));sys.stdout.flush()\n':''))+'time.sleep(30)\n';
    fs.writeFileSync(scriptPath,fixture);
    try{
      const started=Date.now(),result=spawnSync(process.env.GBX,args,{encoding:'utf8',timeout:10000,env});
      assert.equal(result.error,undefined,'large request blocked before deadline');assert.notEqual(result.status,0);assert.match(result.stderr,/Filename normalization failed/);assert.ok(Date.now()-started<6000);assert.ok(!(result.stdout+result.stderr).includes(marker));assert.throws(()=>process.kill(Number(fs.readFileSync(pidFile,'utf8')),0),{code:'ESRCH'},'stalled worker was not reaped');
    }finally{if(fs.existsSync(pidFile)){try{process.kill(Number(fs.readFileSync(pidFile,'utf8')),'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}}
  }
  fs.rmSync(pidFile,{force:true});fs.writeFileSync(file,payload+' ');fs.writeFileSync(scriptPath,'open('+JSON.stringify(pidFile)+',"w").write("started")\n'+probe);const refused=spawnSync(process.env.GBX,args,{encoding:'utf8',timeout:10000,env});assert.equal(refused.error,undefined);assert.notEqual(refused.status,0);assert.match(refused.stderr,/Filename normalization failed/);assert.ok(!fs.existsSync(pidFile),'oversized frame started worker');
  console.log('Native private pipe: exact 64KiB binary payload/hash within a maximum-size 96KiB frame and NUL/Unicode marker in project/archive, controlled small capacity, pre-sent ACK refusal and ready-only/mid-request stalls bounded and reaped, oversized frame denied before worker startup passed');
}finally{fs.rmSync(work,{recursive:true,force:true});}
