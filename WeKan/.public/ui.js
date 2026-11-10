/* MIT License. Shared decoration for native Gambas controls. */
(function(root){
  'use strict';
  if(root.webaUI)return;
  // Gambas 3 uses GET /x?c=... even for password and mutation events. Keep
  // the native protocol, but move its payload into POST and tag same-origin
  // command/upload requests. The host rejects simple/cross-origin requests.
  if(root.XMLHttpRequest){
    const requests=new WeakMap(),prototype=root.XMLHttpRequest.prototype;
    const open=prototype.open,send=prototype.send;
    prototype.open=function(method,address,...options){
      requests.delete(this);
      const url=new URL(address,root.location.href);
      const native=url.origin===root.location.origin &&
        (url.pathname==='/x'||url.pathname==='/c'||/^\/(upload|call):/.test(url.pathname));
      if(native){
        const state={};
        if(url.pathname==='/x'&&method.toUpperCase()==='GET'){
          state.body=url.searchParams.toString();
          url.search='';method='POST';
        }
        requests.set(this,state);
      }
      return open.call(this,method,native?url.href:address,...options);
    };
    prototype.send=function(body){
      const state=requests.get(this);
      if(state){
        this.setRequestHeader('X-WeBa-Request','1');
        if(state.body!==undefined){
          this.setRequestHeader('Content-Type','application/x-www-form-urlencoded;charset=UTF-8');
          body=state.body;
        }
      }
      return send.call(this,body);
    };
  }
  const icons={Swimlanes:'th-large',Kanban:'trello',Calendar:'calendar',Gantt:'bar-chart',TableView:'table',Charts:'pie-chart',ContextMembers:'users',CardMembersButton:'users',CardAssigneesButton:'user',ContextAssignees:'user',AddCardPerson:'user-plus',RemoveCardPerson:'user-times',ContextAssignSelf:'user-plus',SaveMember:'save',RemoveMember:'user-times',ImportBoard:'download',ContextDelete:'trash-o',ContextRename:'pencil',ContextCopy:'clipboard',ContextMove:'arrow-up',ContextColor:'paint-brush',ContextStar:'star-o',ContextWatch:'eye-slash',ContextWip:'ban',ContextDescription:'align-left',ContextHistory:'history',ContextExport:'upload',ContextArchive:'archive',ContextRestore:'undo',ContextAddCard:'plus',ContextAddList:'plus',ContextAddLane:'plus',Starred:'star',BoardSettings:'cog',ArchivedItems:'archive',ContextComments:'comment-o',ContextChecklists:'check-square-o',ContextChecklistItems:'check',ContextSubtasks:'sitemap',ContextDependencies:'link',ContextFields:'list-alt',ContextTime:'clock-o',ContextAttachments:'paperclip',CardComments:'comment-o',CardChecklists:'check-square-o',CardChecklistItems:'check',CardSubtasks:'sitemap',CardDependencies:'link',CardFields:'list-alt',CardTime:'clock-o',CardAttachments:'paperclip',DetailStart:'play',DetailStop:'stop',DetailExport:'upload',DetailDownload:'download',DetailDelete:'trash-o'};
  let markdownGeneration=0,appliedMarkdownRaw=null,appliedMarkdownSchemes=null,appliedExternalLinks=null;
  function syncMarkdownPolicy(){
    const snapshot=document.querySelector('[id$=".MarkdownPolicySnapshot"]');if(!snapshot||!root.webaWorkspaceMarkdown)return;
    const raw=snapshot.textContent.trim()==='1';
    if(appliedMarkdownRaw!==raw){appliedMarkdownRaw=raw;root.webaWorkspaceMarkdown.configure({alwaysShowCodeAsText:raw});}
    const schemes=document.querySelector('[id$=".MarkdownUrlSnapshot"]');
    if(schemes&&schemes.textContent&&appliedMarkdownSchemes!==schemes.textContent){const text=JSON.parse(schemes.textContent);appliedMarkdownSchemes=schemes.textContent;root.webaWorkspaceMarkdown.configure({urlSchemes:root.webaWorkspaceMarkdown.parseUrlSchemes(text)});}
  }
  function syncExternalLinks(){
    const snapshot=document.querySelector('[id$=".MarkdownExternalSnapshot"]');if(!snapshot?.textContent||!root.webaWorkspaceMarkdown||appliedExternalLinks===snapshot.textContent)return;
    const data=JSON.parse(snapshot.textContent);appliedExternalLinks=snapshot.textContent;
    root.webaWorkspaceMarkdown.configure({externalLinkPattern:{prefix:data.externalLinkPatternPrefix||'',urlTemplate:data.externalLinkPatternUrl||''},externalLinkRules:{rules:data.externalLinkRules||'',aliases:data.externalLinkIdentifierAliases||''}});
  }
  const workspaceIconState=new WeakMap();
  function workspaceIcons(){
    for(const row of document.querySelectorAll('.weba-space-row')){
      const button=row.querySelector('.weba-space-open'),source=row.querySelector('.weba-space-icon-source');
      const holder=button?.querySelector('.gw-button-text');if(!button||!source||!holder)continue;
      const text=source.textContent,name=button.title,prior=workspaceIconState.get(button);
      if(prior?.text===text&&prior.name===name&&prior.generation===markdownGeneration&&holder.querySelector('.workspace-name'))continue;
      const icon=document.createElement('span');icon.className='workspace-icon';icon.setAttribute('aria-hidden','true');
      if(text){
        const value=document.createElement('span');value.className='workspace-icon-value';
        if(root.webaWorkspaceMarkdown)value.innerHTML=root.webaWorkspaceMarkdown.render(text);else value.textContent=text;
        icon.append(value);
      }else{const folder=document.createElement('i');folder.className='fa fa-folder';icon.append(folder);}
      icon.addEventListener('click',event=>event.preventDefault());
      const label=document.createElement('span');label.className='workspace-name';label.textContent=name;
      if(text)holder.replaceChildren(icon,document.createTextNode(' '),label);else holder.replaceChildren(icon,label);
      if(button.getAttribute('aria-label')!==name)button.setAttribute('aria-label',name);
      workspaceIconState.set(button,{text,name,generation:markdownGeneration});
    }
  }
  function loadWorkspaceMarkdown(){
    if(root.webaWorkspaceMarkdown||document.querySelector('script[data-weba-markdown]'))return;
    const script=document.createElement('script');script.src='workspace-markdown.js';script.dataset.webaMarkdown='1';
    script.addEventListener('load',()=>{markdownGeneration++;decorate();});document.head.append(script);
  }
  function workspaceText(value){let binary='';for(const byte of new TextEncoder().encode(value))binary+=String.fromCharCode(byte);return btoa(binary);}
  function subworkspaceForm(panel,editing,revision,workspaceId){
    const label=document.querySelector('[id$=".SubworkspaceNameLabel"]'),control=document.querySelector('[id$=".SubworkspaceName"]'),caption=document.querySelector('[id$=".AddSubworkspace"]');
    if(!label||!control||!caption)return;
    let form=panel.querySelector('form.js-workspace-subspace-form');
    if(!editing){if(form){panel.insertBefore(label,form);panel.insertBefore(control,form);form.remove();}return;}
    const textarea=control.matches('textarea')?control:control.querySelector('textarea');if(!textarea)return;
    if(!form){
      form=document.createElement('form');form.className='workspace-subspace-form js-workspace-subspace-form';
      form.style.cssText='display:flex;flex-direction:column;gap:6px;width:100%';panel.insertBefore(form,label);form.append(label,control);
      const submit=document.createElement('button');submit.type='submit';submit.className='gw-button';form.append(submit);
      form.addEventListener('submit',event=>{event.preventDefault();const target=document.querySelector('[id$=".WorkspaceCreateAction"]');if(target)root.gw.update(target.id,'text','subspace|'+form.dataset.revision+'|'+workspaceText(textarea.value));});
    }
    if(!textarea.classList.contains('js-subworkspace-name'))textarea.classList.add('js-subworkspace-name');
    if(textarea.getAttribute('aria-labelledby')!==label.id)textarea.setAttribute('aria-labelledby',label.id);
    if(form.dataset.id!==workspaceId)form.dataset.id=workspaceId;
    if(form.dataset.revision!==revision)form.dataset.revision=revision;
    const submit=form.querySelector('button[type=submit]'),text=caption.textContent.trim();if(submit.textContent!==text)submit.textContent=text;
  }
  function workspaceForm(){
    const panel=document.querySelector('[id$=".WorkspacePanel"]');
    if(!panel)return;
    const label=document.querySelector('[id$=".WorkspaceNameLabel"]'),control=document.querySelector('[id$=".WorkspaceName"]'),save=document.querySelector('[id$=".SaveWorkspace"]');
    if(!label||!control||!save)return;
    const textarea=control.matches('textarea')?control:control.querySelector('textarea');if(!textarea)return;
    const editing=panel.classList.contains('weba-workspace-edit');
    const iconLabel=document.querySelector('[id$=".WorkspaceIconLabel"]'),iconControl=document.querySelector('[id$=".WorkspaceIcon"]');
    const icon=iconControl?.matches('input')?iconControl:iconControl?.querySelector('input');
    const mode=editing?'edit':'create',selector=editing?'js-workspace-actions-form':'js-add-workspace-form';
    let form=panel.querySelector('form.weba-workspace-form');
    if(form&&form.dataset.mode!==mode){
      for(const node of [label,control,iconLabel,iconControl])if(node&&form.contains(node))panel.insertBefore(node,form);
      form.remove();form=null;
    }
    if(!editing&&!panel.classList.contains('weba-workspace-create'))return;
    if(!form){
      form=document.createElement('form');form.className=selector+' weba-workspace-form';form.dataset.mode=mode;
      form.style.cssText='display:flex;flex-direction:column;gap:6px;width:100%';
      panel.insertBefore(form,label);form.append(label,control);
      if(editing&&iconLabel&&iconControl)form.append(iconLabel,iconControl);
      const submit=document.createElement('input');submit.type='submit';submit.className='gw-button';form.append(submit);
      form.addEventListener('submit',event=>{
        event.preventDefault();if(!form.reportValidity())return;
        const target=document.querySelector('[id$=".WorkspaceCreateAction"]');if(!target)return;
        const fields=[mode,form.dataset.revision,workspaceText(textarea.value)];if(editing)fields.push(workspaceText(icon?.value||''));
        root.gw.update(target.id,'text',fields.join('|'));
      });
    }
    for(const [name,enabled] of [['js-workspace-name',editing],['js-new-workspace-name',!editing]])if(textarea.classList.contains(name)!==enabled)textarea.classList.toggle(name,enabled);
    if(icon&&!icon.classList.contains('js-workspace-icon'))icon.classList.add('js-workspace-icon');
    const workspaceId=[...panel.classList].find(value=>value.startsWith('weba-workspace-id-'))?.slice('weba-workspace-id-'.length)||'';
    if(form.dataset.id!==workspaceId)form.dataset.id=workspaceId;
    if(textarea.getAttribute('aria-labelledby')!==label.id)textarea.setAttribute('aria-labelledby',label.id);
    if(icon&&iconLabel&&icon.getAttribute('aria-labelledby')!==iconLabel.id)icon.setAttribute('aria-labelledby',iconLabel.id);
    textarea.required=true;
    const revision=[...panel.classList].find(value=>value.startsWith('weba-workspace-revision-'))?.slice('weba-workspace-revision-'.length)||'';
    subworkspaceForm(panel,editing,revision,workspaceId);
    const changed=form.dataset.revision!==revision;form.dataset.revision=revision;
    const submit=form.querySelector('input[type="submit"]'),caption=save.textContent.trim();
    if(submit.value!==caption)submit.value=caption;
    if(changed&&panel.getBoundingClientRect().width)textarea.focus({preventScroll:true});
  }
  function sortControls(){
    for(const [name,value] of Object.entries({SortCustom:'custom',SortTitleAsc:'title-asc',SortTitleDesc:'title-desc'})){
      let control=document.querySelector('[id$=".'+name+'"]');if(!control)continue;
      if(control.tagName==='BUTTON'){
        const link=document.createElement('a');
        for(const attribute of control.attributes)link.setAttribute(attribute.name,attribute.value);
        link.href='#';link.setAttribute('role','button');
        while(control.firstChild)link.append(control.firstChild);
        link.addEventListener('click',event=>{event.preventDefault();if(link.getAttribute('aria-disabled')==='true')event.stopImmediatePropagation();},true);
        link.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();link.click();}});
        control.replaceWith(link);control=link;
      }
      if(!control.classList.contains('js-boards-sort'))control.classList.add('js-boards-sort');
      if(control.dataset.sort!==value)control.dataset.sort=value;
    }
  }
  function decorate(){
    if(!root.document)return;
    workspaceForm();
    const schemesField=document.querySelector('textarea[id$=".MarkdownSchemes"]'),schemesLabel=document.querySelector('[id$=".MarkdownSchemesHeading"]');
    if(schemesField&&schemesLabel&&schemesField.getAttribute("aria-labelledby")!==schemesLabel.id)schemesField.setAttribute("aria-labelledby",schemesLabel.id);
    for(const name of ["ExternalPrefix","ExternalUrl","ExternalRules","ExternalAliases"]){const field=document.querySelector(`textarea[id$=".${name}"]`),label=document.querySelector(`[id$=".${name}Label"]`);if(field&&label&&field.getAttribute("aria-labelledby")!==label.id)field.setAttribute("aria-labelledby",label.id);}
    syncMarkdownPolicy();
    syncExternalLinks();
    workspaceIcons();
    sortControls();
    const boardSearch=document.querySelector('[id$=".BoardSearch:entry"]');
    if(boardSearch&&!boardSearch.classList.contains("js-board-search-input"))boardSearch.classList.add("js-board-search-input");
    const remaining=document.querySelector('[id$=".Remaining"]');
    if(remaining){if(!remaining.classList.contains('js-select-menu'))remaining.classList.add('js-select-menu');if(remaining.dataset.type!=='remaining')remaining.dataset.type='remaining';}
    for(const [name,icon] of Object.entries(icons)){
      document.querySelectorAll(`[id$=".${name}"]`).forEach(button=>{
        const nameIcon=name==='ContextStar'&&button.classList.contains('weba-starred')?'star':name==='ContextWatch'&&button.classList.contains('weba-watched')?'eye':icon;
        let i=button.querySelector('.weba-native-icon');
        if(!i){i=document.createElement('i');i.setAttribute('aria-hidden','true');button.prepend(i);}
        const className='fa fa-'+nameIcon+' weba-native-icon';if(i.className!==className)i.className=className;
      });
    }
    document.querySelectorAll('.weba-space-row').forEach(row=>{
      const id=[...row.classList].find(value=>/^weba-space-id-\d+$/.test(value));
      const parent=[...row.classList].find(value=>/^weba-space-parent-\d+$/.test(value));
      if(id)row.dataset.workspaceId=id.slice('weba-space-id-'.length);
      if(parent)row.dataset.workspaceParent=parent.slice('weba-space-parent-'.length);
      row.querySelector('.weba-space-drag')?.setAttribute('data-drag-kind','workspace');
    });
    root.webaDrag?.restoreWorkspaceFocus?.();
    document.querySelectorAll('button.gw-button').forEach(button=>{
      const disabled=button.classList.contains('gw-disabled');
      if(button.disabled!==disabled)button.disabled=disabled;
      if(button.getAttribute('aria-disabled')!==String(disabled))button.setAttribute('aria-disabled',String(disabled));
    });
    document.querySelectorAll('.weba-icon-only').forEach(button=>{
      if(button.title&&button.getAttribute('aria-label')!==button.title)button.setAttribute('aria-label',button.title);
    });
    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const name=src.includes('folder.png')?'folder-o':src.includes('doc.png')?'file-text-o':null;
      if(!name||img.previousElementSibling?.classList.contains('weba-tree-icon'))return;
      const icon=document.createElement('i');icon.className='fa fa-'+name+' weba-tree-icon';icon.setAttribute('aria-hidden','true');img.before(icon);img.hidden=true;
    });
  }
  function syncColor(){
    const wheel=document.querySelector('.weba-custom-color');
    if(!wheel)return;
    const input=document.getElementById(wheel.dataset.target+':entry');
    if(input&&/^#[0-9a-f]{6}$/i.test(input.value))wheel.value=input.value;
  }
  root.webaUI={decorate,syncColor};
  function start(){
    document.addEventListener('input',event=>{
      if(event.target.id?.endsWith('.MemberUsername:entry'))root.gw?.update(event.target.id.slice(0,-6),'text',event.target.value);
      const wheel=document.querySelector('.weba-custom-color');
      if(!wheel)return;
      if(event.target===wheel){
        const input=document.getElementById(wheel.dataset.target+':entry');
        if(input){input.value=wheel.value;gw.update(wheel.dataset.target,'text',wheel.value);}
      }else if(event.target.id===wheel.dataset.target+':entry')syncColor();
    });
    root.addEventListener('weba-language-changed',workspaceForm);
    root.addEventListener('weba-workspace-markdown-changed',()=>{markdownGeneration++;decorate();});
    loadWorkspaceMarkdown();
    decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
