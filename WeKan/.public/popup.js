/* MIT License. Anchor native and embedded popups inside the visible viewport. */
(function(root){
  'use strict';
  if(root.webaPopup)return;
  const anchors=new Map();
  let editorAnchor=null,editorWasVisible=false,scheduled=false;
  const visible=panel=>!!panel && panel.getBoundingClientRect().width>0 && panel.getBoundingClientRect().height>0;
  function bounds(){
    const v=root.visualViewport;
    return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||root.innerWidth,height:v?.height||root.innerHeight};
  }
  function style(panel,key,value){if(panel.style.getPropertyValue(key)!==value)panel.style.setProperty(key,value,'important');}
  function snapshot(trigger){
    const r=trigger.getBoundingClientRect();
    const column=trigger.closest('.weba-column');
    const kind=['weba-add-card-top','weba-add-card-bottom','weba-list-menu'].find(name=>trigger.classList.contains(name));
    const lane=column?.dataset.lane,list=column?.dataset.list,listId=column?.dataset.listId,board=column?.closest('.weba-content')?.dataset.board;
    const id=trigger.id,card=trigger.dataset.cardKey;
    const resolve=()=>{
      if(trigger.isConnected)return trigger;
      if(id)return document.getElementById(id);
      if(column&&kind){
        const match=[...document.querySelectorAll('.weba-column')].find(e=>e.dataset.lane===lane&&e.dataset.list===list&&(!listId||e.dataset.listId===listId)&&e.closest('.weba-content')?.dataset.board===board);
        return match?.querySelector('.'+kind);
      }
      if(card)return [...document.querySelectorAll('.weba-card')].find(e=>e.dataset.cardKey===card&&visible(e));
      return null;
    };
    return {trigger,resolve,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
  }
  function position(panel,anchor){
    if(!visible(panel))return;
    const viewport=bounds(),margin=8,gap=6;
    const trigger=anchor?.resolve?.() || (anchor?.trigger?.isConnected?anchor.trigger:null);
    const rect=trigger?trigger.getBoundingClientRect():anchor?.rect||{left:viewport.left+margin,bottom:viewport.top+64,top:viewport.top+64};
    const maxWidth=Math.max(1,viewport.width-margin*2),maxHeight=Math.max(1,viewport.height-margin*2);
    style(panel,'position','fixed');style(panel,'box-sizing','border-box');
    style(panel,'inset-inline-end','auto');style(panel,'inset-block-start','auto');
    style(panel,'right','auto');style(panel,'bottom','auto');
    style(panel,'max-width',maxWidth+'px');style(panel,'max-height',maxHeight+'px');style(panel,'overflow','auto');
    if(panel.classList.contains('weba-editor'))style(panel,'width',Math.min(340,maxWidth)+'px');
    const size=panel.getBoundingClientRect();
    const clamp=(number,min,max)=>Math.max(min,Math.min(max,number));
    const left=clamp(rect.left,viewport.left+margin,viewport.left+viewport.width-size.width-margin);
    const below=viewport.top+viewport.height-margin-rect.bottom-gap;
    const above=rect.top-viewport.top-margin-gap;
    let top=rect.bottom+gap;
    if(size.height>below && above>below)top=rect.top-size.height-gap;
    top=clamp(top,viewport.top+margin,viewport.top+viewport.height-size.height-margin);
    style(panel,'left',left+'px');style(panel,'top',top+'px');
  }
  function near(panel,trigger){
    anchors.set(panel,snapshot(trigger));
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');
    position(panel,anchors.get(panel));
    schedule();
  }
  function rememberEditor(trigger){editorAnchor=snapshot(trigger);schedule();}
  function refresh(){
    scheduled=false;
    if(!root.document)return;
    const editor=document.querySelector('[id$=".Editor"]');
    if(visible(editor)){
      editor.setAttribute('role','dialog');
      const heading=document.querySelector('[id$=".CardHeading"]');
      if(heading)editor.setAttribute('aria-labelledby',heading.id);
      position(editor,editorAnchor);
      editorWasVisible=true;
      root.webaAlignFocus?.();
    }else if(editorWasVisible){
      editorWasVisible=false;
      const trigger=editorAnchor?.resolve?.();
      if(trigger)trigger.focus({preventScroll:true});
      editorAnchor=null;
    }
    for(const [panel,anchor] of anchors){
      if(!panel.isConnected){anchors.delete(panel);continue;}
      if(visible(panel))position(panel,anchor);
    }
  }
  function syncFocus(){
    const outline=document.getElementById('gw-focus');let active=document.activeElement;
    if(!outline||!active)return;
    if(active.closest('.weba-content')&&!active.id){
      if(outline.style.display!=='none')outline.style.display='none';
    }else if(active.closest('.weba-editor')){
      while(active&&(!active.id||active.id.includes(':')))active=active.parentElement;
      if(!active)return;
      const a=active.getBoundingClientRect(),b=outline.getBoundingClientRect();
      if(Math.abs(a.left-b.left)>1||Math.abs(a.top-b.top)>1)root.webaAlignFocus?.();
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;root.requestAnimationFrame(refresh);}
  function closeButton(parent,close){
    const button=document.createElement('button');button.type='button';button.className='weba-popup-close fa fa-times-thin';
    const caption=root.webaI18n?.t('Close')||'Close';
    button.title=caption;button.setAttribute('aria-label',caption);
    button.onclick=event=>{event.stopPropagation();close();};parent.prepend(button);return button;
  }
  root.webaPopup={near,rememberEditor,position,bounds,closeButton};
  function start(){
    document.addEventListener('click',event=>{
      const target=event.target.closest('button,[role="button"]');
      if(!target)return;
      if(target.matches('.weba-add-card-top,.weba-add-card-bottom,[id$=".NewCard"],.weba-card'))rememberEditor(target);
      for(const [button,panel] of [['ViewMenu','Views'],['AccountToggle','AccountMenu']]){
        if(target.id.endsWith('.'+button)){
          const popup=document.querySelector(`[id$=".${panel}"]`);
          if(popup)near(popup,target);
        }
      }
    },true);
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      const html=[...document.querySelectorAll('.weba-structure-menu,.weba-structure-composer')].filter(visible).pop();
      if(html){html.querySelector('.weba-popup-close')?.click();event.preventDefault();return;}
      for(const [panel,close] of [['Editor','CloseEditor'],['Views','CloseViews'],['AccountMenu','CloseAccount']]){
        if(visible(document.querySelector(`[id$=".${panel}"]`))){document.querySelector(`[id$=".${close}"]`)?.click();event.preventDefault();break;}
      }
    });
    new MutationObserver(records=>{syncFocus();if(records.some(record=>record.target.id!=='gw-focus'))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden']});
    root.addEventListener('resize',schedule);root.addEventListener('scroll',schedule,true);
    root.visualViewport?.addEventListener('resize',schedule);root.visualViewport?.addEventListener('scroll',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
