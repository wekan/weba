/* MIT License. Private native profile choice; unset follows touch capability. */
(function(root){
 'use strict';if(root.webaDragPreference)return;let effective;
 function touch(){const n=root.navigator||{};if('maxTouchPoints' in n)return n.maxTouchPoints>0;if('msMaxTouchPoints' in n)return n.msMaxTouchPoints>0;const q=root.matchMedia?.('(pointer:coarse)');if(q?.media==='(pointer:coarse)')return !!q.matches;if('orientation' in root)return true;return /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(n.userAgent||'')||/\b(Android|Windows Phone|iPad|iPod)\b/i.test(n.userAgent||'');}
 function enabled(){const value=document.querySelector('[data-weba-drag-preference]')?.dataset.webaDragPreference;return value==='true'?true:value==='false'?false:touch();}
 function sync(){
  if(!root.document)return;
  const on=enabled();if(effective!==undefined&&effective!==on)root.webaDrag?.cancel();effective=on;
  document.querySelectorAll('.weba-view-order-list').forEach(list=>{const value=String(on);if(list.dataset.handles!==value){root.webaViewOrder?.cancel();list.dataset.handles=value;}list.querySelectorAll('.weba-view-order-handle').forEach(n=>{n.hidden=!on;n.tabIndex=on?0:-1;});list.querySelectorAll('.weba-view-order-label').forEach(n=>{n.classList.toggle('weba-view-order-surface',!on);});});
  document.querySelectorAll('.weba-board-tile-group').forEach(row=>{const handle=row.querySelector('.weba-board-drag'),surface=row.querySelector('.weba-board-tile');if(handle){handle.hidden=!on;handle.tabIndex=on?0:-1;}surface?.classList.toggle('weba-board-drag-surface',!on);});
  const workspaceActive=document.querySelector('.weba-content')?.dataset.workspaceReorder==='true';document.querySelectorAll('.weba-space-row').forEach(row=>{const handle=row.querySelector('.weba-space-drag'),surface=row.querySelector('.weba-space-open');if(handle){handle.hidden=!workspaceActive||!on;handle.tabIndex=workspaceActive&&on?0:-1;}surface?.classList.toggle('weba-space-drag-surface',workspaceActive&&!on);});
  document.querySelectorAll('.weba-drag-preference-toggle').forEach(n=>{const value=String(on);if(n.getAttribute('aria-checked')!==value)n.setAttribute('aria-checked',value);const label=n.querySelector('[data-caption]');if(label){const text=root.webaI18n?.t(label.dataset.caption)||label.dataset.caption;if(label.textContent!==text)label.textContent=text;}});
 }
 function start(){document.addEventListener('click',e=>{const n=e.target.closest?.('.weba-drag-preference-toggle');if(!n)return;e.preventDefault();root.gw?.update(n.dataset.command,'text',n.dataset.revision+'|'+String(!enabled()),null);},true);new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-weba-drag-preference','data-workspace-reorder']});root.addEventListener('weba-language-changed',sync);root.matchMedia?.('(pointer:coarse)')?.addEventListener?.('change',sync);sync();}
 root.webaDragPreference={enabled,sync,touch};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
