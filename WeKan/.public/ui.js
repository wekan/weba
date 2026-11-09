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
  function decorate(){
    if(!root.document)return;
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
    decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
