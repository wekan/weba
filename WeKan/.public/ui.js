/* MIT License. Shared decoration for native Gambas controls. */
(function(root){
  'use strict';
  if(root.webaUI)return;
  const icons={Swimlanes:'th-large',Kanban:'trello',Calendar:'calendar',Gantt:'bar-chart',TableView:'table',Charts:'pie-chart',ContextRename:'pencil',ContextCopy:'clipboard',ContextMove:'arrow-up',ContextColor:'paint-brush',ContextStar:'star-o',ContextWatch:'eye-slash',ContextWip:'ban',ContextDescription:'align-left',ContextHistory:'history',ContextExport:'upload',ContextArchive:'archive',ContextRestore:'undo',ContextAddCard:'plus',ContextAddList:'plus',ContextAddLane:'plus',Starred:'star',BoardSettings:'cog',ArchivedItems:'archive',ContextComments:'comment-o',ContextChecklists:'check-square-o',ContextChecklistItems:'check',ContextSubtasks:'sitemap',ContextDependencies:'link',ContextFields:'list-alt',ContextTime:'clock-o',ContextAttachments:'paperclip',CardComments:'comment-o',CardChecklists:'check-square-o',CardChecklistItems:'check',CardSubtasks:'sitemap',CardDependencies:'link',CardFields:'list-alt',CardTime:'clock-o',CardAttachments:'paperclip',DetailStart:'play',DetailStop:'stop',DetailDownload:'download',DetailDelete:'trash-o'};
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
  root.webaUI={decorate};
  function start(){
    decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
