const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const publicDir=path.join(__dirname,'../WeKan/.public');
const dom = new JSDOM(`<div id="@1.LanguageSelector"><select data-weba-language></select></div>
<div id="@1.WebLabelUser">Username</div><button id="@1.WebButtonLogin">Login</button>
<div id="@1.PageTitle">Boards</div><input id="@1.WebTextName" value="Username">
<article class="weba-card"><strong>Username</strong></article>`,{url:'http://localhost',runScripts:'outside-only'});
const {window}=dom;
window.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(publicDir,url),'utf8'))});
window.eval(fs.readFileSync(path.join(publicDir,'i18n-catalog.js'),'utf8'));
window.eval(fs.readFileSync(path.join(publicDir,'i18n.js'),'utf8'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
(async()=>{
  const api=window.webaI18n, doc=window.document;
  await api.setLanguage('fi-FI');
  assert.equal(api.language,'fi');
  const fi=JSON.parse(fs.readFileSync(path.join(publicDir,'i18n/fi.json'),'utf8'));
  const key=window.webaI18nCatalog.lookup.Username;
  assert.equal(doc.getElementById('@1.WebLabelUser').textContent,fi[key]);
  assert.equal(doc.documentElement.lang,'fi');
  assert.equal(window.localStorage.getItem('weba.language'),'fi');
  assert.equal(doc.querySelector('select').options.length,237);
  assert.equal(doc.querySelector('input').value,'Username','user input remains unchanged');
  assert.equal(doc.querySelector('.weba-card strong').textContent,'Username','card content remains unchanged');
  assert.equal(doc.getElementById('@1.PageTitle').textContent,'Boards','board title remains unchanged');
  doc.getElementById('@1.WebButtonLogin').textContent='Register';
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(doc.getElementById('@1.WebButtonLogin').textContent,api.t('Register'),'AJAX updates translated');
  await api.setLanguage('ar');
  assert.equal(doc.documentElement.dir,'rtl');
  await api.setLanguage('en');
  assert.equal(doc.documentElement.dir,'ltr');
  assert.equal(doc.getElementById('@1.WebLabelUser').textContent,'Username','English restored');
  assert.equal(api.resolve('../../x'),'en','unknown language cannot become a file path');
  window.fetch=async()=>{throw Error('offline');};
  await api.setLanguage('fi');
  assert.equal(api.language,'en','fetch failure retains working language');
  for(const language of window.webaI18nCatalog.languages) {
    const values=JSON.parse(fs.readFileSync(path.join(publicDir,'i18n',language.code+'.json'),'utf8'));
    for(const [key,text] of Object.entries(values))assert.equal(typeof text,'string',key);
  }
  window.close();
  console.log('Translations: 237 catalogs, language selection, persistence, RTL, AJAX, fallbacks and user-content isolation passed');
})().catch(error=>{window.close();console.error(error);process.exitCode=1;});
