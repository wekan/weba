// The shipped bundle vs the unchanged parent viewer/helper and sanitizer.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
(async()=>{
 let source=process.env.WEKAN_SOURCE,ancestor=path.resolve(__dirname,'..');
 while(!source&&path.dirname(ancestor)!==ancestor){if(fs.existsSync(path.join(ancestor,'packages/markdown/src/template-integration.js')))source=ancestor;else ancestor=path.dirname(ancestor);}
 if(!source)throw Error('Original source Markdown viewer unavailable');
 const req=createRequire(path.join(source,'package.json')),{JSDOM}=req('jsdom');
 const makeDOM=()=>new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost',runScripts:'outside-only'}),bundled=makeDOM(),original=makeDOM();
 try{
 const publicDir=path.join(__dirname,'../WeKan/.public'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../vendor/wekan-markdown/manifest.json'),'utf8'));
 for(const [name,hash] of Object.entries(manifest.adapters))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../tools/workspace-markdown',name))).digest('hex'),hash,'adapter drift: '+name);
 for(const [name,version] of Object.entries(manifest.packages))assert.equal(JSON.parse(fs.readFileSync(path.join(source,'node_modules',name,'package.json'),'utf8')).version,version,'dependency drift: '+name);
 for(const [name,sha] of Object.entries(manifest.sourceFiles)){
  const content=fs.readFileSync(path.join(source,'packages/markdown/src',name));assert.equal(crypto.createHash('sha256').update(content).digest('hex'),sha,'source drift: '+name);
  assert.deepEqual(fs.readFileSync(path.join(__dirname,'../vendor/wekan-markdown',name)),content);
 }
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(publicDir,'workspace-markdown.js'))).digest('hex'),manifest.bundleSha256);
 const parserSource=fs.readFileSync(path.join(source,'models/lib/urlSchemeAllowlist.js'));
 assert.deepEqual(fs.readFileSync(path.join(__dirname,'../vendor/wekan-markdown/urlSchemeAllowlist.js')),parserSource);
 assert.equal(crypto.createHash('sha256').update(parserSource).digest('hex'),manifest.urlSchemeParserSha256);
 bundled.window.eval(fs.readFileSync(path.join(publicDir,'workspace-markdown.js'),'utf8'));
 const sourceParse=req(path.join(source,'models/lib/urlSchemeAllowlist.js')).parseAllowedUrlSchemes;
 for(const input of [null,0,'','THUNDERLINK:, file://; OnEnOtE: file javascript: data: search-ms: telnet: https:', 'a+b a.b a-b 1bad '+'x'.repeat(33),Array.from({length:70},(_,i)=>'scheme'+i).join(',')])assert.deepEqual(Array.from(bundled.window.webaWorkspaceMarkdown.parseUrlSchemes(input)),sourceParse(input));
 let helper;const context={DOMPurify:req('dompurify')(original.window),MarkdownIt:req('markdown-it'),markdownItEmoji:req('markdown-it-emoji'),
  markdownItMath:(await import(pathToFileURL(req.resolve('markdown-it-math/no-default-renderer')).href)).default,temml:req('temml'),hljs:req('highlight.js/lib/common'),
  window:original.window,document:original.window.document,URL:original.window.URL,console,
  HTML:{TEXTMODE:{STRING:'string'},Raw:value=>String(value)},
  Blaze:{_toText:value=>String(value),Template:{registerHelper(name,template){assert.equal(name,'markdown');helper=template.render;}}},
  Template:class{constructor(name,render){this.render=render;}},ReactiveVar:class{constructor(value){this.value=value;}get(){return this.value;}set(value){this.value=value;}},
 };
 vm.createContext(context);
 const clean=text=>text.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(clean(fs.readFileSync(path.join(source,'packages/markdown/src/secureDOMPurify.js'),'utf8')),context);
 vm.runInContext(clean(fs.readFileSync(path.join(source,'packages/markdown/src/template-integration.js'),'utf8'))+'\nthis.originalMarkdown=Markdown;',context);
 const cases=['','📁','**Bold**','*Italic* ~~deleted~~',':rocket:', '`<img onerror=alert(1)>`','[safe](https://example.test)','file:///tmp/example',
  '[bad](javascript:alert(1))','<script>window.pwned=1</script>','<img src=x onerror="window.pwned=1">','<svg onload=alert(1)><script>alert(1)</script></svg>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>','<a href="data:text/html,x">bad</a>','[](/hidden)','<!-- first -->text<!-- second -->',
  '- [ ] Task\n- [x] Done','<input type=password name=secret value=canary>','<input type=checkbox checked onclick=alert(1)>',
  '$x^2$','$$\\frac{a}{b}$$','```js\nconst x = "<script>";\n```','| A | B |\n|---|---|\n| 1 | 2 |',
  '<div id="clobber" class="unsafe" style="position:fixed" data-x="1">literal</div>','[x](thunderlink://abc)','![x](data:image/svg+xml;base64,PHN2Zz4=)',
  '<math><annotation-xml encoding="text/html"><img src=x onerror=alert(1)></annotation-xml></math>'];
 let total=0;
 for(const policy of [{},{alwaysShowCodeAsText:true},{alwaysShowCodeAsText:false,urlSchemes:['file','thunderlink'],externalLinkPattern:{prefix:'#',urlTemplate:'https://example.test/{number}'},externalLinkRules:{rules:'X-{number} = https://example.test/x/{number}',aliases:''}},{alwaysShowCodeAsText:false,urlSchemes:['javascript','data','file']}]){
  bundled.window.webaWorkspaceMarkdown.configure(policy);for(const [key,value] of Object.entries(policy))context.originalMarkdown[key].set(value);
  for(const text of [...cases,'#42 X-7']){
   const actual=bundled.window.webaWorkspaceMarkdown.render(text),expected=helper.call({templateContentBlock:text});assert.equal(actual,expected,text);
   const fragment=JSDOM.fragment(actual);assert.equal(fragment.querySelector('script,iframe,svg,form,object,embed'),null,text);
   for(const node of fragment.querySelectorAll('*'))for(const attribute of node.attributes)assert.ok(!/^on/i.test(attribute.name),text);
   for(const node of fragment.querySelectorAll('[href],[src]'))for(const attribute of ['href','src'])assert.ok(!/^\s*(?:(?:javascript|vbscript):|data:text\/html(?:[;,]|$))/i.test(node.getAttribute(attribute)||''),text);
   for(const input of fragment.querySelectorAll('input')){assert.equal(input.type,'checkbox');assert.equal(input.disabled,true);assert.equal(input.hasAttribute('name'),false);}
   total++;
  }
 }
 console.log('Workspace Markdown: '+total+' bundle outputs match unchanged source viewer/helper/sanitizer with explicit synchronous Blaze/ReactiveVar adapters; source hashes, full/raw/custom-scheme policies and executable/form injection guards passed');
 }finally{bundled.window.close();original.window.close();}
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
