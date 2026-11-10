/* MIT License. Native manager view ordering; authority and drafts stay server-bound. */
(function(root){
 'use strict';if(root.webaViewOrder)return;
 let pending=null,drag=null,focus=null,suppressUntil=0,frame=0;
 const listOf=n=>n?.closest?.('.weba-view-order-list'),rows=list=>[...list.querySelectorAll(':scope > .weba-view-order-row')],visible=list=>!!list?.isConnected&&list.getBoundingClientRect().height>0;
 const encode=value=>btoa(Array.from(new TextEncoder().encode(String(value)),b=>String.fromCharCode(b)).join(''));
 const t=value=>root.webaI18n?.t(value)||value;
 function send(list,action,key,direction){
  if(!visible(list)||!root.gw||!list.dataset.command||!list.dataset.revision)return;
  focus={command:list.dataset.command,revision:list.dataset.revision,scroll:list.scrollTop,key:Array.isArray(key)?drag?.key:key};
  root.gw.update(list.dataset.command,'text',[action,list.dataset.revision,encode(Array.isArray(key)?JSON.stringify(key):key),...(direction?[direction]:[])].join('|'),null);
 }
 function reset(){if(frame)root.cancelAnimationFrame(frame);frame=0;if(drag){drag.marker.remove();drag.ghost.remove();drag.row.classList.remove('weba-view-order-origin');}pending=null;drag=null;document.body.classList.remove('weba-view-order-dragging');}
 function current(state){return visible(state.list)&&state.list.dataset.revision===state.revision&&state.row.isConnected;}
 function sync(){
  document.querySelectorAll('.weba-view-order-list [data-caption]').forEach(node=>{const text=t(node.dataset.caption);if(node.classList.contains('weba-view-order-handle')){if(node.title!==text)node.title=text;if(node.getAttribute('aria-label')!==text)node.setAttribute('aria-label',text);}else if(node.textContent!==text)node.textContent=text;});
  if((drag||pending)&&!current(drag||pending))reset();
  if(focus){const list=[...document.querySelectorAll('.weba-view-order-list')].find(n=>n.dataset.command===focus.command);if(!visible(list)){focus=null;}else if(list.dataset.revision!==focus.revision){const row=rows(list).find(n=>n.dataset.view===focus.key);list.scrollTop=focus.scroll;if(row){const r=row.getBoundingClientRect(),box=list.getBoundingClientRect();if(r.top<box.top)list.scrollTop+=r.top-box.top;else if(r.bottom>box.bottom)list.scrollTop+=r.bottom-box.bottom;row.querySelector((root.webaDragPreference?!root.webaDragPreference.enabled():list.dataset.handles==='false')?'.weba-view-order-label':'.weba-view-order-handle')?.focus({preventScroll:true});}focus=null;}}
 }
 function target(state,x,y){
  const box=state.list.getBoundingClientRect();if(x<box.left||x>box.right||y<box.top||y>box.bottom)return -1;
  const others=rows(state.list).filter(row=>row!==state.row);let index=others.length;
  for(let i=0;i<others.length;i++){const r=others[i].getBoundingClientRect();if(y<r.top+r.height/2){index=i;break;}}
  state.list.insertBefore(state.marker,others[index]||null);return index;
 }
 function autoscroll(){frame=0;if(!drag||!current(drag))return;const r=drag.list.getBoundingClientRect();let delta=drag.y<r.top+24?-8:drag.y>r.bottom-24?8:0;if(delta){drag.list.scrollTop+=delta;drag.index=target(drag,drag.x,drag.y);}frame=root.requestAnimationFrame(autoscroll);}
 function move(event){
  const state=drag||pending;if(!state||event.pointerId!==state.pointer)return;if(!current(state)){reset();return;}
  if(!drag){if(Math.hypot(event.clientX-state.x,event.clientY-state.y)<7)return;const ghost=state.row.cloneNode(true),marker=document.createElement('div');ghost.classList.add('weba-view-order-ghost');ghost.setAttribute('aria-hidden','true');marker.className='weba-view-order-marker';document.body.append(ghost);state.row.classList.add('weba-view-order-origin');drag={...state,ghost,marker,key:state.row.dataset.view,index:-1};pending=null;document.body.classList.add('weba-view-order-dragging');frame=root.requestAnimationFrame(autoscroll);}
  event.preventDefault();drag.x=event.clientX;drag.y=event.clientY;drag.ghost.style.left=(drag.x+8)+'px';drag.ghost.style.top=(drag.y+8)+'px';drag.index=target(drag,drag.x,drag.y);
 }
 function finish(event,cancel){
  const state=drag||pending;if(!state||event&&event.pointerId!==state.pointer)return;
  if(drag&&!cancel&&current(drag)&&event)drag.index=target(drag,event.clientX,event.clientY);
  if(drag&&!cancel&&current(drag)&&drag.index>=0){const keys=rows(drag.list).filter(row=>row!==drag.row).map(row=>row.dataset.view);keys.splice(drag.index,0,drag.key);const original=rows(drag.list).map(row=>row.dataset.view);if(JSON.stringify(keys)!==JSON.stringify(original))send(drag.list,'drag',keys);}
  if(drag)suppressUntil=Date.now()+350;reset();
 }
 function start(){
  document.addEventListener('pointerdown',event=>{if(pending||drag){reset();return;}const handle=event.target.closest?.('.weba-view-order-handle,.weba-view-order-surface'),list=listOf(handle),row=handle?.closest('.weba-view-order-row');if(!handle||handle.hidden||!row||!visible(list)||event.button!==0||event.ctrlKey||event.metaKey||event.altKey)return;pending={list,row,revision:list.dataset.revision,pointer:event.pointerId,x:event.clientX,y:event.clientY};},true);
  document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',event=>finish(event,false),true);document.addEventListener('pointercancel',event=>finish(event,true),true);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&(drag||pending)){event.preventDefault();event.stopImmediatePropagation();finish(null,true);return;}const handle=event.target.closest?.('.weba-view-order-handle,.weba-view-order-surface');if(!handle||handle.hidden||!['ArrowUp','ArrowDown'].includes(event.key))return;const list=listOf(handle);if(!visible(list))return;event.preventDefault();send(list,'move',handle.closest('.weba-view-order-row').dataset.view,event.key==='ArrowUp'?'up':'down');},true);
  document.addEventListener('click',event=>{const button=event.target.closest?.('.weba-view-order-handle,.weba-view-order-label');if(!button)return;event.preventDefault();if(Date.now()<suppressUntil)return;if(button.classList.contains('weba-view-order-label'))send(listOf(button),'select',button.closest('.weba-view-order-row').dataset.view);},true);
  root.addEventListener('resize',reset);root.addEventListener('blur',reset);root.addEventListener('weba-language-changed',sync);new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-revision']});sync();
 }
 root.webaViewOrder={cancel:reset};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
