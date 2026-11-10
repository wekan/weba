const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const publicDir=path.join(__dirname,'../WeKan/.public');
const dom = new JSDOM(`<div id="@1.LanguageSelector"><select data-weba-language></select></div>
<div id="@1.WebLabelUser">Username</div><button id="@1.WebButtonLogin">Login</button>
<div id="@1.PageTitle">Boards</div><div id="@1.ContextTitle">Boards</div><div id="@1.ActionTitle">Boards</div><div id="@1.DetailsTitle">Boards</div><input id="@1.WebTextName" value="Username">
<div id="@1.BoardVisibilityName" class="weba-user-text">Public</div><div id="@1.BoardPermission"><select><option value="Public">Public</option><option value="Private">Private</option><option value="Signed-in users">Signed-in users</option></select></div><div id="@1.MemberBoardName">Members</div><div id="@1.MembersTree" class="gw-tree">Normal</div><div id="@1.MemberRole"><select><option value="Read only">Read only</option></select></div>
<div id="@1.CardPeopleHeading">Members</div><div id="@1.CardPeopleName">Members</div><div id="@1.CardPeopleTree" class="gw-tree">Normal</div>
<div id="@1.CardPersonChoice"><select><option value="Normal">Normal</option></select></div><button id="@1.AddCardPerson">Add</button>
<div id="@1.PaneTitle" class="weba-user-text">Members</div>
<div class="weba-space-row"><button class="weba-space-open weba-user-text" title="Members">Members</button><button class="weba-space-drag" title="Move"></button><button class="weba-space-collapse fa-caret-down" title="Collapse"></button></div><button class="weba-space-menu" title="Workspace menu"></button>
<div id="@1.WorkspaceDestination"><select><option value="0">Remaining</option><option value="1">Members</option></select></div>
<div id="@1.SubworkspaceNameLabel">Subworkspace name</div>
<div id="@1.WorkspacePanel" class="weba-workspace-edit"><div id="@1.WorkspaceNameLabel">Workspace name</div></div>
<div id="@1.BoardArchiveName" class="weba-user-text">Archive</div><div id="@1.BoardArchiveWarning">Are you sure you want to archive this board?</div><button id="@1.ConfirmBoardArchive">Archive</button><button id="@1.CancelBoardArchive">Cancel</button>
<h1 class="weba-public-heading">Public</h1><th class="weba-public-board-caption">Board</th><div class="weba-public-description-caption">Description</div><div class="weba-public-empty">No results</div><article class="weba-card"><strong>Username</strong></article>`,{url:'http://localhost',runScripts:'outside-only'});
const {window}=dom;
window.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(publicDir,url),'utf8'))});
window.eval(fs.readFileSync(path.join(publicDir,'i18n-catalog.js'),'utf8'));
window.eval(fs.readFileSync(path.join(publicDir,'i18n.js'),'utf8'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
(async()=>{
  const api=window.webaI18n, doc=window.document;
  assert.equal(window.webaI18nCatalog.lookup.Board,'board');
  for(const [text,key] of Object.entries({'Home':'home','Remove from Home':'home-board-remove','Remove this board from Home? The board itself is not deleted.':'home-board-remove-confirm','Drag only one board here to open it after login':'home-board-empty','Home board (opened after login)':'home-board-badge','Set as Home board (opened after login)':'set-selected-home','Unset as Home board':'unset-selected-home','Please select only one board':'select-only-one-board'}))assert.equal(window.webaI18nCatalog.lookup[text],key);
  await api.setLanguage('fi-FI');
  assert.equal(api.language,'fi');
  const fi=JSON.parse(fs.readFileSync(path.join(publicDir,'i18n/fi.json'),'utf8'));
  const key=window.webaI18nCatalog.lookup.Username;
  assert.equal(doc.getElementById('@1.BoardArchiveWarning').textContent,fi['archive-board-confirm']);
  assert.equal(doc.getElementById('@1.BoardArchiveName').textContent,'Archive','bound board name stays literal');
  assert.equal(doc.getElementById('@1.ConfirmBoardArchive').textContent,api.t('Archive'));
  assert.equal(doc.getElementById('@1.CancelBoardArchive').textContent,api.t('Cancel'));
  assert.equal(doc.getElementById('@1.WorkspaceNameLabel').textContent,fi['allboards.edit-workspace-name']);
  assert.equal(doc.getElementById('@1.SubworkspaceNameLabel').textContent,fi['allboards.add-subworkspace-prompt']);
  doc.getElementById('@1.WorkspacePanel').className='weba-workspace-create';await api.setLanguage('fi');
  assert.equal(doc.getElementById('@1.WorkspaceNameLabel').textContent,fi['allboards.add-workspace-prompt']);
  assert.equal(doc.getElementById('@1.WebLabelUser').textContent,fi[key]);
  assert.equal(doc.getElementById('@1.MemberRole').textContent,api.t('Read only'),'fixed role caption translated');
  assert.equal(doc.getElementById('@1.MemberRole').querySelector('option').value,'Read only','role wire value stays stable');
  assert.equal(doc.querySelector('.weba-public-heading').textContent,fi.public);
  assert.equal(doc.querySelector('.weba-public-description-caption').textContent,fi.description);
  assert.equal(doc.querySelector('.weba-public-empty').textContent,fi['no-results']);
  assert.equal(doc.getElementById('@1.BoardVisibilityName').textContent,'Public','visibility board name stays literal');
  for(const [value,key] of [['Private','private'],['Signed-in users','instance'],['Public','public']]){
    const option=doc.querySelector(`[id="@1.BoardPermission"] option[value="${value}"]`);
    assert.equal(option.textContent,fi[key]);assert.equal(option.value,value,'visibility wire values stay stable');
  }
  assert.equal(doc.getElementById('@1.MemberBoardName').textContent,'Members','user board name stays unchanged');
  assert.equal(doc.getElementById('@1.MembersTree').textContent,'Normal','user identities stay unchanged');
  assert.equal(doc.getElementById('@1.CardPeopleHeading').textContent,api.t('Members'),'card-member heading translated');
  assert.equal(doc.getElementById('@1.AddCardPerson').textContent,api.t('Add'),'card-member add caption translated');
  assert.equal(doc.getElementById('@1.CardPeopleName').textContent,'Members','card title stays unchanged');
  assert.equal(doc.getElementById('@1.CardPeopleTree').textContent,'Normal','card member identity stays unchanged');
  assert.equal(doc.querySelector('[id="@1.CardPersonChoice"] option').textContent,'Normal','candidate username stays unchanged');
  assert.equal(doc.querySelector('[id="@1.CardPersonChoice"] option').value,'Normal','candidate username wire value stays unchanged');
  assert.equal(doc.documentElement.lang,'fi');
  assert.equal(window.localStorage.getItem('weba.language'),'fi');
  assert.equal(doc.querySelector('select').options.length,237);
  assert.equal(doc.querySelector('input').value,'Username','user input remains unchanged');
  assert.equal(doc.querySelector('.weba-card strong').textContent,'Username','card content remains unchanged');
  assert.equal(doc.getElementById('@1.PaneTitle').textContent,'Members','selected workspace title is literal');
  assert.equal(doc.querySelector('.weba-space-open').textContent,'Members','dynamic workspace name is literal');
  assert.equal(doc.querySelector('.weba-space-menu').title,api.t('Workspace menu'),'dynamic workspace menu is translated');
  assert.equal(doc.querySelector('.weba-space-drag').title,api.t('Move')+': Members','workspace drag action translates without changing name');
  const caret=doc.querySelector('.weba-space-collapse');
  assert.equal(caret.title,api.t('Collapse')+': Members','caret translates only the action');
  assert.equal(caret.getAttribute('aria-expanded'),'true','open caret announces expanded');
  caret.classList.replace('fa-caret-down','fa-caret-right');await api.setLanguage('fi');
  assert.equal(caret.title,api.t('Uncollapse')+': Members','folded caret action changes');
  assert.equal(caret.getAttribute('aria-expanded'),'false','folded caret announces collapsed');
  const options=doc.querySelectorAll('[id="@1.WorkspaceDestination"] option');
  assert.equal(options[0].textContent,api.t('Remaining'),'only the explicit Remaining destination is translated');
  assert.equal(options[0].value,'0','translated destination preserves native wire value');
  assert.equal(options[1].textContent,'Members','workspace destination name is literal');

  assert.equal(doc.getElementById('@1.PageTitle').textContent,'Boards','board title remains unchanged');
  for(const name of ['ContextTitle','ActionTitle','DetailsTitle'])assert.equal(doc.getElementById('@1.'+name).textContent,'Boards','popup titles preserve user content');
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
