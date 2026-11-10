/* MIT License. Handle-based touch sorting; ordinary touch gestures keep native scrolling. */
(function(root){
  'use strict';
  if(root.webaDrag)return;
  let pending=null,drag=null,keyboardFocus=null,workspaceKeyboardFocus=null,suppressUntil=0,frame=0;
  const threshold=7;
  const t=text=>root.webaI18n?.t(text)||text;
  const visible=e=>e && !e.hidden && e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0;
  function encode(text){return btoa(Array.from(new TextEncoder().encode(String(text)),byte=>String.fromCharCode(byte)).join(''));}
  function enabled(section,kind){return kind==='workspace'?section.dataset.workspaceReorder==='true':(kind==='board-drop'||kind==='board-multi-drop')?section.dataset.boardDrop==='true':kind==='board'?section.dataset.boardReorder==='true'||section.dataset.boardDrop==='true':kind==='card'?section.dataset.cardMove==='true'||section.dataset.editable==='true':section.dataset.editable==='true';}
  function send(section,kind,values){
    if(!enabled(section,kind)||!section.dataset.drag||!root.gw)return;
    root.gw.update(section.dataset.drag,'text',[kind,...values.map(encode)].join('|'),null);
  }
  function identify(target,pointerType){
    const handle=target.closest('.weba-drag-handle');
    const card=target.closest('.weba-list-body>.weba-card');
    const board=target.closest('.weba-board-tile-group');
    const workspace=target.closest('.weba-space-row');
    let kind=handle?.dataset.dragKind,element;
    if(kind==='workspace'||pointerType==='mouse'&&workspace&&target.closest('.weba-space-open')){kind='workspace';element=workspace;}
    else if(kind==='board'||pointerType==='mouse'&&board&&target.closest('.weba-board-tile')){kind='board';element=board;}
    else if(kind==='lane')element=handle.closest('.weba-swimlane');
    else if(kind==='list')element=handle.closest('.weba-column');
    else if(kind==='card'||(pointerType==='mouse'&&card&&!target.closest('button,input,textarea,a,select'))){kind='card';element=card;}
    const section=kind==='workspace'?document.querySelector('.weba-content'):element?.closest('.weba-content');
    if(!element||!section||!section.dataset.drag)return null;
    if(!enabled(section,kind))return null;
    const group=kind==='board'&&section.dataset.multiActive==='true'&&element.dataset.selected==='true'
      ?{revision:section.dataset.selectionRevision,count:section.dataset.selectionCount}:null;
    return {kind,element,section,handle,group};
  }
  function reset(){
    if(frame)root.cancelAnimationFrame(frame);frame=0;
    clearWorkspaceMark();
    if(drag){drag.ghost.remove();drag.placeholder.remove();drag.element.classList.remove('weba-drag-origin');}
    drag=null;pending=null;document.body.classList.remove('weba-is-dragging');
  }
  function begin(){
    const state=pending;if(!state)return;
    const rect=state.element.getBoundingClientRect();
    const ghost=state.element.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
    ghost.classList.add('weba-drag-ghost');ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{width:rect.width+'px',height:Math.min(rect.height,200)+'px',left:rect.left+'px',top:rect.top+'px'});
    if(state.group){const badge=document.createElement('span');badge.className='weba-multidrag-count';badge.textContent=state.group.count;ghost.append(badge);}
    document.body.append(ghost);
    const placeholder=document.createElement('div');placeholder.className='weba-drop-placeholder';
    placeholder.style.height=Math.min(rect.height,200)+'px';placeholder.style.width=rect.width+'px';
    state.element.classList.add('weba-drag-origin');document.body.classList.add('weba-is-dragging');
    drag={...state,ghost,placeholder,dx:state.startX-rect.left,dy:state.startY-rect.top,target:null};
    try{state.handle?.setPointerCapture(state.pointerId);}catch(_){}
    tick();
  }
  function insert(parent,before){if(drag.placeholder.parentNode!==parent||drag.placeholder.nextSibling!==before)parent.insertBefore(drag.placeholder,before);}
  function workspaceRows(section){
    return [...(section.closest('.weba-shell')||document).querySelectorAll('.weba-space-row')].filter(row=>!row.closest('.weba-drag-ghost'));
  }
  function workspaceDropPosition(offsetY,height){
    if(height==null||offsetY==null)return 'inside';
    const h=Number(height),y=Number(offsetY);
    if(!Number.isFinite(h)||h<=0||!Number.isFinite(y))return 'inside';
    if(y<h*.25)return 'before';
    if(y>h*.75)return 'after';
    return 'inside';
  }
  function clearWorkspaceMark(){
    if(drag?.marked){drag.marked.classList.remove('weba-space-drop-before','weba-space-drop-after','weba-space-drop-inside','weba-board-drop-target');drag.marked=null;}
  }
  function validWorkspaceTarget(rows,source,target){
    const byId=new Map(rows.map(row=>[row.dataset.workspaceId,row]));
    const seen=new Set();let current=target;
    while(current){
      const id=current.dataset.workspaceId;
      if(id===source.dataset.workspaceId||seen.has(id))return false;
      seen.add(id);
      const parent=current.dataset.workspaceParent;
      if(!parent||parent==='0')return true;
      current=byId.get(parent);
      if(!current)return false;
    }
    return false;
  }
  function locate(x,y){
    const hit=document.elementFromPoint(x,y);
    if(!drag.section.isConnected||!drag.element.isConnected){drag.target=null;drag.placeholder.remove();clearWorkspaceMark();return;}
    if(drag.kind==='workspace'){
      const row=hit?.closest('.weba-space-row'),rows=workspaceRows(drag.section);
      if(!row||!rows.includes(row)||!validWorkspaceTarget(rows,drag.element,row)){drag.target=null;clearWorkspaceMark();return;}
      const rect=row.getBoundingClientRect(),position=workspaceDropPosition(y-rect.top,rect.height);
      const cls='weba-space-drop-'+position;
      if(drag.marked!==row||!row.classList.contains(cls)){clearWorkspaceMark();row.classList.add(cls);drag.marked=row;}
      drag.target={id:row.dataset.workspaceId,position};return;
    }
    if(drag.kind==='board'&&drag.section.dataset.boardDrop==='true'){
      const row=hit?.closest('.weba-space-row');
      const menu=hit?.closest('[id$=".Remaining"],[id$=".Starred"],[id$=".Archive"]');
      let target,id='0';
      if(row&&workspaceRows(drag.section).includes(row)){target='workspace';id=row.dataset.workspaceId;}
      else if(menu){
        target=menu.id.endsWith('.Remaining')?'remaining':menu.id.endsWith('.Starred')?'starred':'archive';
        const source=drag.section.dataset.boardSource;
        if(target==='starred'&&!['remaining','workspace'].includes(source)||target==='archive'&&source==='archive')target=null;
      }
      if(target){
        const node=row||menu,cls='weba-board-drop-target';
        if(drag.marked!==node||!node.classList.contains(cls)){clearWorkspaceMark();node.classList.add(cls);drag.marked=node;}
        drag.placeholder.remove();drag.target={drop:target,id};return;
      }
      clearWorkspaceMark();
      if(drag.group||drag.section.dataset.boardReorder!=='true'){drag.target=null;drag.placeholder.remove();return;}
    }
    if(!hit||hit.closest('.weba-content')!==drag.section){drag.target=null;drag.placeholder.remove();return;}
    let parent,items,before,lane;
    if(drag.kind==='board'){
      parent=drag.section.querySelector('.weba-data');
      if(!parent?.contains(hit)){drag.target=null;drag.placeholder.remove();return;}
      items=[...parent.querySelectorAll(':scope>.weba-board-tile-group')].filter(e=>e!==drag.element);
      const rtl=getComputedStyle(parent).direction==='rtl';
      before=items.find(e=>{const r=e.getBoundingClientRect();if(y<r.top)return true;if(y>r.bottom)return false;return rtl?x>r.left+r.width/2:x<r.left+r.width/2;});
      drag.target={before:before?.dataset.boardId||'0'};insert(parent,before||null);
    }else if(drag.kind==='card'){
      const column=hit.closest('.weba-column');parent=column?.querySelector('.weba-list-body');
      if(!visible(parent)){drag.target=null;drag.placeholder.remove();return;}
      items=[...parent.querySelectorAll(':scope>.weba-card')].filter(e=>e!==drag.element);
      before=items.find(e=>y<e.getBoundingClientRect().top+e.getBoundingClientRect().height/2);
      lane=column.dataset.lane;
      drag.target={lane,list:column.dataset.listId?'#'+column.dataset.listId:column.dataset.list,before:before?.dataset.cardId||'0'};
      insert(parent,before||parent.querySelector('.weba-add-card-bottom'));
    }else if(drag.kind==='list'){
      parent=hit.closest('.weba-columns')||hit.closest('.weba-swimlane')?.querySelector('.weba-columns');
      if(!visible(parent)){drag.target=null;drag.placeholder.remove();return;}
      lane=parent.closest('.weba-swimlane').dataset.lane;
      if(!lane||drag.section.dataset.view!=='Swimlanes')lane=drag.element.dataset.lane;
      items=[...parent.querySelectorAll(':scope>.weba-column')].filter(e=>e!==drag.element);
      const rtl=getComputedStyle(parent).direction==='rtl';
      before=items.find(e=>{const r=e.getBoundingClientRect();return rtl?x>r.left+r.width/2:x<r.left+r.width/2;});
      drag.target={lane,before:before?(before.dataset.listId?'#'+before.dataset.listId:before.dataset.list):''};insert(parent,before||null);
    }else{
      parent=drag.section.querySelector('.weba-report');
      if(!parent.contains(hit)){drag.target=null;drag.placeholder.remove();return;}
      items=[...parent.querySelectorAll(':scope>.weba-swimlane')].filter(e=>e!==drag.element);
      before=items.find(e=>y<e.getBoundingClientRect().top+e.getBoundingClientRect().height/2);
      drag.target={before:before?.dataset.lane||''};insert(parent,before||null);
    }
  }
  function tick(){
    if(!drag)return;
    const {x,y}=drag;
    Object.assign(drag.ghost.style,{left:(x-drag.dx)+'px',top:(y-drag.dy)+'px'});
    locate(x,y);
    let element=document.elementFromPoint(x,y);
    while(element&&element!==document.body){
      const r=element.getBoundingClientRect(),css=getComputedStyle(element),edge=36;
      if(/auto|scroll/.test(css.overflowX)&&element.scrollWidth>element.clientWidth){
        if(x<r.left+edge)element.scrollLeft-=12;else if(x>r.right-edge)element.scrollLeft+=12;
      }
      if(/auto|scroll/.test(css.overflowY)&&element.scrollHeight>element.clientHeight){
        if(y<r.top+edge)element.scrollTop-=12;else if(y>r.bottom-edge)element.scrollTop+=12;
      }
      element=element.parentElement;
    }
    frame=root.requestAnimationFrame(tick);
  }
  function finish(cancel=false){
    if(!drag){pending=null;return;}
    const state=drag;locate(state.x,state.y);const target=state.target;
    suppressUntil=Date.now()+700;reset();
    if(cancel||!target)return;
    if(state.kind==='workspace')send(state.section,'workspace',[state.element.dataset.workspaceId,target.id,target.position,'']);
    else if(state.kind==='board'&&target.drop){
      if(target.drop==='archive'&&!root.confirm(t('Are you sure you want to archive this board?')))return;
      send(state.section,state.group?'board-multi-drop':'board-drop',[state.element.dataset.boardId,target.drop,target.id,state.group?state.group.revision:'']);
    }
    else if(state.kind==='board')send(state.section,'board',[state.element.dataset.boardId,'','',target.before]);
    else if(state.kind==='card')send(state.section,'card',[state.element.dataset.cardId,target.lane,target.list,target.before]);
    else if(state.kind==='lane')send(state.section,'lane',[state.element.dataset.lane,'','',target.before]);
    else{
      const sourceLane=state.element.dataset.lane;
      if(sourceLane!==target.lane&&(state.pointerType==='touch'||root.matchMedia('(pointer:coarse)').matches||root.innerWidth<760)&&!root.confirm(t('Move this list and all its cards to the other swimlane?')))return;
      send(state.section,'list',[sourceLane,state.element.dataset.listId?'#'+state.element.dataset.listId:state.element.dataset.list,target.lane,target.before]);
    }
  }
  function down(event){
    keyboardFocus=null;workspaceKeyboardFocus=null;
    if(!event.isPrimary){finish(true);return;}
    if(event.button!==0||pending||drag)return;
    const state=identify(event.target,event.pointerType);if(!state)return;
    pending={...state,pointerType:event.pointerType,pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};
  }
  function move(event){
    const state=drag||pending;if(!state||state.pointerId!==event.pointerId)return;
    state.x=event.clientX;state.y=event.clientY;
    if(!drag&&Math.hypot(state.x-state.startX,state.y-state.startY)>=threshold)begin();
    if(drag){drag.x=event.clientX;drag.y=event.clientY;event.preventDefault();}
  }
  function up(event){if((drag||pending)?.pointerId===event.pointerId){if(drag){drag.x=event.clientX;drag.y=event.clientY;}finish();}}
  function keyboard(event){
    const handle=event.target.closest('.weba-drag-handle');if(!handle||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    const state=identify(handle,'keyboard');if(!state)return;
    if(state.kind!=='board')keyboardFocus=null;
    if(state.kind!=='workspace')workspaceKeyboardFocus=null;
    event.preventDefault();event.stopPropagation();
    if(state.kind==='workspace'){
      const all=workspaceRows(state.section),parent=state.element.dataset.workspaceParent;
      const siblings=all.filter(row=>row.dataset.workspaceParent===parent),index=siblings.indexOf(state.element);
      const rtl=getComputedStyle(state.element).direction==='rtl';
      let target,position;
      if(event.key==='ArrowUp'){target=siblings[index-1];position='before';}
      else if(event.key==='ArrowDown'){target=siblings[index+1];position='after';}
      else if(event.key===(rtl?'ArrowLeft':'ArrowRight')){target=siblings[index-1];position='inside';}
      else if(parent&&parent!=='0'){target=all.find(row=>row.dataset.workspaceId===parent);position='after';}
      if(!target||!validWorkspaceTarget(all,state.element,target)){
        // Outdent goes beside the parent; it is not an inside/cycle operation.
        if(!target||position!=='after'||target.dataset.workspaceId!==parent)return;
      }
      workspaceKeyboardFocus={id:state.element.dataset.workspaceId,target:target.dataset.workspaceId,position,expires:Date.now()+5000};
      send(state.section,'workspace',[state.element.dataset.workspaceId,target.dataset.workspaceId,position,'']);
    }else if(state.kind==='board'){
      if(state.group||state.section.dataset.boardReorder!=='true')return;
      const rows=[...state.element.parentElement.querySelectorAll(':scope>.weba-board-tile-group')],index=rows.indexOf(state.element),rtl=getComputedStyle(state.element).direction==='rtl';
      const backward=event.key==='ArrowUp'||event.key===(rtl?'ArrowRight':'ArrowLeft');
      if(backward&&index===0||!backward&&index===rows.length-1)return;
      const before=rows[index+(backward?-1:2)]?.dataset.boardId||'0';
      const order=rows.map(row=>row.dataset.boardId).filter(id=>id!==state.element.dataset.boardId);
      order.splice(before==='0'?order.length:order.indexOf(before),0,state.element.dataset.boardId);
      keyboardFocus={id:state.element.dataset.boardId,order,expires:Date.now()+5000};
      send(state.section,'board',[state.element.dataset.boardId,'','',before]);
    }else if(state.kind==='card'){
      const column=state.element.closest('.weba-column');
      if(['ArrowLeft','ArrowRight'].includes(event.key)){
        const columns=[...column.parentElement.querySelectorAll(':scope>.weba-column')],index=columns.indexOf(column),rtl=getComputedStyle(column).direction==='rtl';
        const delta=(event.key==='ArrowRight'?1:-1)*(rtl?-1:1),target=columns[index+delta];
        if(target)send(state.section,'card',[state.element.dataset.cardId,target.dataset.lane,target.dataset.listId?'#'+target.dataset.listId:target.dataset.list,'0']);
      }else{
        const cards=[...state.element.parentElement.querySelectorAll(':scope>.weba-card')],index=cards.indexOf(state.element);
        const before=event.key==='ArrowUp'?cards[index-1]:cards[index+2];
        if(event.key==='ArrowUp'&&index===0)return;
        send(state.section,'card',[state.element.dataset.cardId,column.dataset.lane,column.dataset.listId?'#'+column.dataset.listId:column.dataset.list,before?.dataset.cardId||'0']);
      }
    }else if(state.kind==='list'){
      const columns=[...state.element.parentElement.querySelectorAll(':scope>.weba-column')],index=columns.indexOf(state.element),rtl=getComputedStyle(state.element).direction==='rtl';
      const backward=(event.key==='ArrowLeft')!==rtl;
      if(!['ArrowLeft','ArrowRight'].includes(event.key)||backward&&index===0)return;
      send(state.section,'list',[state.element.dataset.lane,state.element.dataset.listId?'#'+state.element.dataset.listId:state.element.dataset.list,state.element.dataset.lane,(()=>{const e=columns[index+(backward?-1:2)];return e?(e.dataset.listId?'#'+e.dataset.listId:e.dataset.list):'';})()]);
    }else{
      const rows=[...state.element.parentElement.querySelectorAll(':scope>.weba-swimlane')],index=rows.indexOf(state.element);
      if(!['ArrowUp','ArrowDown'].includes(event.key)||event.key==='ArrowUp'&&index===0)return;
      send(state.section,'lane',[state.element.dataset.lane,'','',rows[index+(event.key==='ArrowUp'?-1:2)]?.dataset.lane||'']);
    }
  }
  function restoreFocus(section){
    if(!keyboardFocus)return;
    if(Date.now()>keyboardFocus.expires||section.dataset.boardReorder!=='true'){keyboardFocus=null;return;}
    const rows=[...section.querySelectorAll('.weba-data>.weba-board-tile-group')];
    if(rows.length!==keyboardFocus.order.length||rows.some((row,index)=>row.dataset.boardId!==keyboardFocus.order[index]))return;
    const handle=rows.find(row=>row.dataset.boardId===keyboardFocus.id)?.querySelector('.weba-drag-handle');
    keyboardFocus=null;
    root.requestAnimationFrame(()=>{if(handle?.isConnected&&document.activeElement===document.body){handle.focus({preventScroll:true});root.webaAlignFocus?.();}});
  }
  function restoreWorkspaceFocus(){
    if(!workspaceKeyboardFocus)return;
    const section=document.querySelector('.weba-content');
    if(Date.now()>workspaceKeyboardFocus.expires||section&&section.dataset.workspaceReorder!=='true'){workspaceKeyboardFocus=null;return;}
    if(!section)return;
    const state=workspaceKeyboardFocus,rows=workspaceRows(section);
    const moved=rows.find(row=>row.dataset.workspaceId===state.id),target=rows.find(row=>row.dataset.workspaceId===state.target);
    if(!target)return;
    let ready=false;
    if(state.position==='inside')ready=moved?.dataset.workspaceParent===state.target||!moved&&target.querySelector('.fa-caret-right');
    else if(moved&&moved.dataset.workspaceParent===target.dataset.workspaceParent){
      const siblings=rows.filter(row=>row.dataset.workspaceParent===target.dataset.workspaceParent);
      ready=siblings.indexOf(moved)===siblings.indexOf(target)+(state.position==='before'?-1:1);
    }
    if(!ready)return;
    const handle=(moved||target).querySelector('.weba-space-drag');workspaceKeyboardFocus=null;
    root.requestAnimationFrame(()=>{if(handle?.isConnected&&document.activeElement===document.body){handle.focus({preventScroll:true});root.webaAlignFocus?.();}});
  }
  function start(){
    document.addEventListener('pointerdown',down);
    document.addEventListener('pointermove',move,{passive:false});
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',()=>finish(true));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(drag||pending)){event.preventDefault();event.stopImmediatePropagation();finish(true);}else keyboard(event);},true);
    document.addEventListener('click',event=>{if(Date.now()<suppressUntil||event.target.closest('.weba-drag-handle')){event.preventDefault();event.stopImmediatePropagation();}},true);
    root.addEventListener('blur',()=>finish(true));
  }
  root.webaDrag={identify,restoreFocus,restoreWorkspaceFocus,workspaceDropPosition,cancel:()=>finish(true),get active(){return !!drag;},get clickSuppressed(){return Date.now()<suppressUntil;},threshold};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
