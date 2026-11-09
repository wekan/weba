// Rebuild the portable viewer from the parent checkout's exact source/dependencies.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]||path.join(root,'../../..'));
const requireSource=createRequire(path.join(source,'package.json')),webpack=requireSource('webpack');
const names=['template-integration.js','secureDOMPurify.js'];
for(const name of names)fs.copyFileSync(path.join(source,'packages/markdown/src',name),path.join(root,'vendor/wekan-markdown',name));
fs.copyFileSync(path.join(source,'models/lib/urlSchemeAllowlist.js'),path.join(root,'vendor/wekan-markdown/urlSchemeAllowlist.js'));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(root,'vendor/wekan-markdown/LICENSE'));
const adapter=path.join(__dirname,'workspace-markdown/meteor-adapter.js');
const aliases=Object.fromEntries(['blaze','htmljs','templating','reactive-var'].map(name=>['meteor/'+name+'$',adapter]));
webpack({mode:'production',target:'web',context:source,entry:path.join(__dirname,'workspace-markdown/entry.js'),
 output:{path:path.join(root,'WeKan/.public'),filename:'workspace-markdown.js',library:{name:'webaWorkspaceMarkdown',type:'window'}},
 resolve:{alias:aliases,modules:[path.join(source,'node_modules'),'node_modules'],extensions:['.js','.mjs','.json']},
 performance:{hints:false},devtool:false,
},(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error?.message||stats.toString({all:false,errors:true}));process.exitCode=1;return;}
 const metadata=stats.toJson({all:false,modules:true,nestedModules:true}),packages=new Set();
 function collect(modules){for(const module of modules||[]){for(const match of (module.identifier||'').matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g))packages.add(match[1]);collect(module.modules);}}
 collect(metadata.modules);
 const versions={};let licenses='WeKan source viewer:\n'+fs.readFileSync(path.join(source,'LICENSE'),'utf8')+'\n'+fs.readFileSync(path.join(source,'node_modules/webpack/LICENSE'),'utf8')+'\n';
 for(const name of [...packages].sort()){
  const dir=path.join(source,'node_modules',name),pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));versions[name]=pkg.version;licenses+='\nPackage metadata: '+JSON.stringify({name,version:pkg.version,license:pkg.license,author:pkg.author,repository:pkg.repository})+'\n';
  const license=fs.readdirSync(dir).filter(file=>/^(license|licence|copying)([.-]|$)/i.test(file));
  licenses+='\n=== '+name+' '+pkg.version+' ('+(pkg.license||'see upstream')+') ===\n';
  for(const file of license)licenses+=fs.readFileSync(path.join(dir,file),'utf8')+'\n';
  if(!license.length){const readme=fs.readdirSync(dir).find(file=>/^readme/i.test(file));licenses+='Package license: '+pkg.license+'\n';if(readme)licenses+=fs.readFileSync(path.join(dir,readme),'utf8')+'\n';}
 }
 fs.writeFileSync(path.join(root,'WeKan/.public/workspace-markdown-LICENSES.txt'),licenses);
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 fs.writeFileSync(path.join(root,'vendor/wekan-markdown/manifest.json'),JSON.stringify({source:'wekan/wekan packages/markdown/src',build:{webpack:webpack.version,node:process.versions.node},adapters:Object.fromEntries(['entry.js','meteor-adapter.js'].map(name=>[name,sha(path.join(__dirname,'workspace-markdown',name))])),sourceFiles:Object.fromEntries(names.map(name=>[name,sha(path.join(root,'vendor/wekan-markdown',name))])),urlSchemeParserSha256:sha(path.join(root,'vendor/wekan-markdown/urlSchemeAllowlist.js')),packages:versions,bundleSha256:sha(path.join(root,'WeKan/.public/workspace-markdown.js'))},null,2)+'\n');
 console.log('Source Markdown viewer bundled; '+packages.size+' dependency licenses recorded');
});
