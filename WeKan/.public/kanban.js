/* MIT License. Reports embedded in a Gambas WebContainer. */
(function (root) {
  'use strict';
  const t = text => root.webaI18n ? root.webaI18n.t(text) : text;
  const collapsed = root.webaCollapsed || (root.webaCollapsed = new Set());
  const summary = cards => [...new Set(['Todo', 'Doing', 'Done', ...cards.map(c=>c.status)])].map(status => ({status, count: cards.filter(c => c.status === status).length}));
  const monthDays = (year, month) => new Date(year, month + 1, 0).getDate();
  function render() {
    document.querySelectorAll('.weba-content').forEach(section => {
      if(section.dataset.boardColor)document.documentElement.style.setProperty('--weba-board-color',section.dataset.boardColor);
      const data = section.querySelector('.weba-data'), report = section.querySelector('.weba-report');
      if (!data || !report) return;
      report.replaceChildren(); data.hidden = false;
      if(section.dataset.guestViewOrder){
        const controls=document.querySelector('[id$=".GuestViews"]');
        for(const view of JSON.parse(section.dataset.guestViewOrder)){
          if(!['Swimlanes','Lists','Table','Calendar'].includes(view))continue;
          const button=document.querySelector('[id$=".Guest'+view+'"]');
          if(controls&&button&&button.parentElement===controls)controls.append(button);
        }
      }
      data.querySelectorAll('.weba-home-remove-label').forEach(el=>{el.textContent=t('Remove from Home');});
      data.querySelectorAll('.weba-home-empty').forEach(el=>{el.textContent=t('Drag only one board here to open it after login');});
      data.querySelectorAll('.board-home-badge').forEach(badge=>{const label=t('Home board (opened after login)');badge.title=label;badge.setAttribute('aria-label',label);});
      data.querySelectorAll('[data-drag-kind="board"]').forEach(handle=>{const label=t(section.dataset.boardReorder==='true'?'Sort boards':'Move')+': '+(handle.closest('.weba-board-tile-group')?.querySelector('strong')?.textContent||'');handle.title=label;handle.setAttribute('aria-label',label);});
      data.querySelectorAll('.weba-board-tile-group').forEach(group=>{
        const active=section.dataset.multiActive==='true';
        group.classList.toggle('weba-board-selected',active&&group.dataset.selected==='true');
        let input=group.querySelector('.weba-board-select');
        if(active&&!input){input=document.createElement('input');input.type='checkbox';input.className='weba-board-select';group.prepend(input);}
        if(!active){input?.remove();return;}
        input.checked=group.dataset.selected==='true';
        const label=t('Multi-Selection')+': '+(group.querySelector('strong')?.textContent||'');input.title=label;input.setAttribute('aria-label',label);
        input.onchange=()=>{
          if(!root.gw||!section.dataset.selectionAction)return;
          root.webaSelectionFocus={id:group.dataset.boardId,revision:Number(section.dataset.selectionRevision)+1,checked:input.checked,expires:Date.now()+5000};
          root.gw.update(section.dataset.selectionAction,'text','toggle|'+btoa(group.dataset.boardId),null);
        };
      });
      const selectionFocus=root.webaSelectionFocus;
      if(selectionFocus&&Date.now()>selectionFocus.expires)root.webaSelectionFocus=null;
      else if(selectionFocus&&Number(section.dataset.selectionRevision)>=selectionFocus.revision){
        const group=[...data.querySelectorAll('.weba-board-tile-group')].find(group=>group.dataset.boardId===selectionFocus.id),input=group?.querySelector('.weba-board-select');
        if(input&&input.checked===selectionFocus.checked){root.webaSelectionFocus=null;root.requestAnimationFrame(()=>{if(input.isConnected&&document.activeElement===document.body)input.focus({preventScroll:true});});}
      }
      data.querySelectorAll('[data-board-key]').forEach(tile => {
        if(tile.tagName==='A'){tile.onclick=null;return;}
        tile.onclick = event => {
          if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
          if (root.gw && section.dataset.tree) root.gw.update(section.dataset.tree, '$' + btoa(tile.dataset.boardKey), null);
        };
      });
      function nativeMenu(kind,id,trigger,action){
        const panel=document.querySelector('[id$=".ContextMenu"]');
        if(!panel||!section.dataset.context||!root.gw)return false;
        root.webaPopup?.near(panel,trigger);
        if(action)root.webaPopup?.near(document.querySelector('[id$=".ActionPanel"]'),trigger);
        root.gw.update(section.dataset.context,'text',kind+'|'+id+(action?'|'+action:''),null);return true;
      }
      data.querySelectorAll('[data-context-kind]').forEach(button=>button.onclick=event=>{event.stopPropagation();nativeMenu(button.dataset.contextKind,button.dataset.contextId,button);});
      root.webaDrag?.restoreFocus?.(section);
      const cards = [...data.querySelectorAll('.weba-card')].sort((a,b)=>Number(a.dataset.order||0)-Number(b.dataset.order||0)), view = section.dataset.view;
      function add(parent, tag, text, cls, localize = true) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = localize ? t(text) : text;
        if (cls) el.className = cls;
        parent.append(el); return el;
      }
      function reportCard(card, parent, full = false) {
        if (!card.dataset.cardKey || !card.dataset.cardId || !section.dataset.board) {
          if (full) { const clone=card.cloneNode(true); parent.append(clone); return clone; }
          return add(parent,'span',card.querySelector('strong').textContent,undefined,false);
        }
        const link=document.createElement('a');
        link.className='weba-card-link weba-user-text';
        link.dataset.cardId=card.dataset.cardId;
        link.href='/b/'+encodeURIComponent(section.dataset.board)+'/board/'+encodeURIComponent(card.dataset.cardId);
        if (full) { for(const attribute of card.attributes)link.setAttribute(attribute.name,attribute.value);link.classList.add('weba-card-link','weba-user-text');link.innerHTML=card.innerHTML; }
        else link.textContent=card.querySelector('strong').textContent;
        parent.append(link);return link;
      }
      if (view === 'Lists' || view === 'Swimlanes') {
        const layout = [...section.querySelectorAll('.weba-layout section[data-lane]')].sort((a,b)=>Number(a.dataset.order||0)-Number(b.dataset.order||0));
        const editable = section.dataset.editable === 'true';
        const cardMovable = section.dataset.cardMove === 'true' || editable;
        const lanes = view === 'Swimlanes' ? [...new Set([...layout.map(l=>l.dataset.lane), ...cards.map(c=>c.dataset.lane || 'Default')])] : ['All cards'];
        if (!lanes.length) lanes.push('Default');
        function send(action, lane, list, title = '') {
          if (!editable || !root.gw || !section.dataset.action) return;
          const encode = text => btoa(Array.from(new TextEncoder().encode(text),byte=>String.fromCharCode(byte)).join(''));
          root.gw.update(section.dataset.action,'text',[action,encode(lane),encode(list),encode(title)].join('|'),null);
        }
        function button(parent, glyph, title, action, cls = '') {
          const el = add(parent,'button',undefined,'weba-board-button '+cls,false);
          const icons={'+':'plus','☰':'bars','⊞':'plus-square-o','▸':'caret-right','▾':'caret-down','✓':'check','×':'times-thin'};
          const icon=icons[glyph] || (glyph.startsWith('+ ')?'plus':null);
          if(icon){const i=add(el,'i',undefined,'fa fa-'+icon);i.setAttribute('aria-hidden','true');if(glyph.startsWith('+ '))add(el,'span',glyph.slice(2),undefined,false);}
          else el.textContent=glyph;
          el.type='button'; el.title=t(title); el.setAttribute('aria-label',t(title));
          el.onclick=event=>{event.preventDefault();event.stopPropagation();action(el);}; return el;
        }
        function handle(parent,kind){
          const el=button(parent,'',kind==='lane'?'Move swimlane':'Move '+kind,()=>{},'weba-drag-handle');el.dataset.dragKind=kind;
          add(el,'i',undefined,'fa fa-arrows').setAttribute('aria-hidden','true');return el;
        }
        function composer(parent, action, lane, after = '', anchor = null) {
          parent.querySelectorAll('.weba-structure-composer').forEach(e=>e.remove());
          const form=add(parent,'form',undefined,'weba-structure-composer');
          if (anchor) anchor.after(form);
          const label=add(form,'label',action==='lane' ? 'Add swimlane' : 'Add list');
          const input=add(label,'input'); input.required=true;input.maxLength=action==='lane'?255:32;
          button(form,'✓','Save',()=>form.requestSubmit());
          if(root.webaPopup)root.webaPopup.closeButton(form,()=>form.remove());
          else button(form,'×','Close',()=>form.remove(),'weba-popup-close');
          form.onsubmit=event=>{event.preventDefault();if(input.value.trim())send(action,lane,after,input.value.trim());};
          form.scrollIntoView?.({block:"nearest",inline:"nearest"});
          input.focus({preventScroll:true});
        }
        function toggle(key, target, trigger) {
          if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
          target.hidden=collapsed.has(key); trigger.querySelector('i').className='fa fa-'+(target.hidden?'caret-right':'caret-down');
          trigger.setAttribute('aria-expanded',String(!target.hidden));
        }
        function menu(parent, actions, trigger) {
          parent.querySelector('.weba-structure-menu')?.remove();
          const popup=add(parent,'div',undefined,'weba-structure-menu');
          if(root.webaPopup)root.webaPopup.closeButton(popup,()=>popup.remove());
          else button(popup,'×','Close',()=>popup.remove(),'weba-popup-close');
          for (const [label,action] of actions) button(popup,t(label),label,()=>{popup.remove();action();});
          if(root.webaPopup && trigger)root.webaPopup.near(popup,trigger);
        }
        lanes.forEach(lane => {
          const row=add(report,'section',undefined,'weba-swimlane');
          row.dataset.lane=lane;
          const laneKey=section.dataset.board+'|'+lane;
          const laneHeader=add(row,'header',undefined,'weba-swimlane-header');
          const laneColor=layout.find(e=>e.dataset.lane===lane)?.dataset.color;if(laneColor)laneHeader.style.backgroundColor=laneColor;
          if(view==='Swimlanes') add(laneHeader,'h3',lane,undefined,false);
          const columns=add(row,'div',undefined,'weba-columns');
          if(view==='Swimlanes') {
            columns.hidden=collapsed.has(laneKey);
            const controls=add(laneHeader,'div',undefined,'weba-swimlane-controls');
            const caret=button(controls,columns.hidden?'▸':'▾','Collapse',el=>toggle(laneKey,columns,el),'weba-collapse-lane');
            caret.setAttribute('aria-expanded',String(!columns.hidden));
            if(editable||section.dataset.context) {
              button(controls,'☰','Swimlane',trigger=>{const id=layout.find(e=>e.dataset.lane===lane)?.dataset.laneId;if(id&&nativeMenu('lane',id,trigger))return;menu(laneHeader,[['Add swimlane',()=>composer(row,'lane',lane)],['Collapse',()=>toggle(laneKey,columns,caret)]],trigger);},'weba-lane-menu');
            }
            if(editable) {
              button(controls,'+','Add swimlane',trigger=>{const id=layout.find(e=>e.dataset.lane===lane)?.dataset.laneId;if(id&&nativeMenu('lane',id,trigger,'Add swimlane'))return;composer(row,'lane',lane);},'weba-add-lane');
              handle(controls,'lane');
            }
          }
          const laneLayout=layout.filter(l=>view==='Lists'||l.dataset.lane===lane);
          const listItems=laneLayout.flatMap(l=>[...l.querySelectorAll('[data-list]')].map(e=>({title:e.dataset.list,id:e.dataset.listId||'',lane:l.dataset.lane})));
          if(!listItems.length&&!laneLayout.length)['Todo','Doing','Done'].forEach(title=>listItems.push({title,id:'',lane:lane==='All cards'?'Default':lane}));
          if(!listItems.length&&editable)button(columns,'⊞','Add list',()=>composer(columns,'list',lane),'weba-empty-add-list');
          cards.filter(c=>view==='Lists'||(c.dataset.lane||'Default')===lane).forEach(c=>{
            if(!listItems.some(item=>item.id?item.id===c.dataset.listId:item.title===c.dataset.status))listItems.push({title:c.dataset.status,id:c.dataset.listId||'',lane:c.dataset.lane||'Default'});
          });
          listItems.forEach(item=>{
            const status=item.title,reference=item.id?'#'+item.id:status;
            const column=add(columns,'section',undefined,'weba-column');
            column.dataset.list=status;column.dataset.listId=item.id;column.dataset.lane=item.lane;
            const meta=laneLayout.flatMap(l=>[...l.querySelectorAll("[data-list]")]).find(e=>e.dataset.listId===item.id);
            if(meta?.dataset.color)column.style.backgroundColor=meta.dataset.color;
            const listHeader=add(column,'header',undefined,'weba-list-header');
            const controls=add(listHeader,'div',undefined,'weba-list-controls');
            const body=add(column,'div',undefined,'weba-list-body');
            const listKey=laneKey+'|'+reference;body.hidden=collapsed.has(listKey);
            const caret=button(controls,body.hidden?'▸':'▾','Collapse',el=>toggle(listKey,body,el),'weba-collapse-list');
            caret.setAttribute('aria-expanded',String(!body.hidden));
            add(controls,'span',undefined,'weba-control-space');
            const actualLane=item.lane;
            column.dataset.lane=actualLane;
            if(editable) {
              handle(controls,'list');
              button(controls,'+','Add card',()=>send('card',actualLane,reference),'weba-add-card-top');
            }
            if(editable||section.dataset.context) {
              button(controls,'☰','List',trigger=>{if(item.id&&nativeMenu('list',item.id,trigger))return;menu(listHeader,[['Add card',()=>{if(root.webaPopup)root.webaPopup.rememberEditor(trigger);send('card',actualLane,reference);}],['Add list',()=>composer(columns,'list',actualLane,reference,column)],['Collapse',()=>toggle(listKey,body,caret)]],trigger);},'weba-list-menu');
            }
            if(editable) {
              button(controls,'⊞','Add list',trigger=>{if(item.id&&nativeMenu('list',item.id,trigger,'Add list'))return;composer(columns,'list',actualLane,reference,column);},'weba-add-list');
            }
            const title=add(listHeader,'h4',status,undefined,['Todo','Doing','Done'].includes(status));
            if(meta?.dataset.star==='1')add(title,'i',undefined,'fa fa-star').setAttribute('aria-hidden','true');
            const limit=Number(meta?.dataset.wip||0),count=Number(meta?.dataset.count||0);
            if(limit>0)add(title,'span',`${count}/${limit}`,'weba-wip-badge'+(count>limit?' weba-wip-exceeded':''),false);
            cards.filter(c=>item.id?c.dataset.listId===item.id:c.dataset.status===status && (view!=='Swimlanes'||(c.dataset.lane||'Default')===lane)).forEach(c=>{
              const linked=!!(c.dataset.cardKey&&c.dataset.cardId&&section.dataset.board),clone=linked?document.createElement('a'):c.cloneNode(true);
              if(linked){for(const attribute of c.attributes)clone.setAttribute(attribute.name,attribute.value);clone.innerHTML=c.innerHTML;clone.classList.add('weba-card-link');clone.draggable=false;clone.href='/b/'+encodeURIComponent(section.dataset.board)+'/board/'+encodeURIComponent(c.dataset.cardId);}
              clone.classList.add('minicard-wrapper');body.append(clone);
              if(c.dataset.color)clone.style.backgroundColor=c.dataset.color;
              if(cardMovable&&c.dataset.cardId){
                clone.classList.add('weba-draggable-card');handle(clone,'card');
              }
              if(c.dataset.cardId&&(editable||section.dataset.context)){
                const menuButton=button(clone,'☰','Card actions',trigger=>nativeMenu('card',c.dataset.cardId,trigger),'weba-card-menu');
              }
              if(c.dataset.cardKey) {
                clone.tabIndex=0;clone.setAttribute('role','button');
                const open=()=>{if(root.webaPopup)root.webaPopup.rememberEditor(clone);if(root.gw&&section.dataset.tree)root.gw.update(section.dataset.tree,'$'+btoa(c.dataset.cardKey),null);};
                if(linked){
                  clone.removeAttribute('tabindex');clone.removeAttribute('role');clone.onkeydown=null;
                  clone.onclick=event=>{if(event.target.closest('button,input,textarea,select')||event.target.closest('a')!==clone)return;if(root.webaDrag?.clickSuppressed){event.preventDefault();event.stopImmediatePropagation();return;}if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||clone.target&&clone.target!=='_self'||clone.hasAttribute('download'))return;event.preventDefault();event.stopPropagation();open();};
                }else{clone.onclick=open;clone.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();open();}};}
              }
            });
            if(editable)button(body,'+ '+t('Add card'),'Add card',()=>send('card',actualLane,reference),'weba-add-card-bottom');
          });
        });
      } else if (view === 'Calendar') {
        const now = new Date(), controls = add(report, 'div', undefined, 'weba-calendar-controls');
        const previous = add(controls, 'button', 'Previous month'), label = add(controls, 'strong'), next = add(controls, 'button', 'Next month');
        previous.type = next.type = 'button';
        for(const [button,icon,title] of [[previous,'chevron-left','Previous month'],[next,'chevron-right','Next month']]){
          button.textContent='';button.title=t(title);button.setAttribute('aria-label',t(title));add(button,'i',undefined,'fa fa-'+icon).setAttribute('aria-hidden','true');
        }
        const grid = add(report, 'div', undefined, 'weba-calendar');
        let year = now.getFullYear(), month = now.getMonth();
        function draw() {
          grid.replaceChildren();
          label.textContent = new Date(year, month, 1).toLocaleDateString(root.webaI18n?.language.replace(/_/g,'-'), {year:'numeric', month:'long'});
          ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => add(grid, 'strong', d));
          for (let i = 0; i < (new Date(year, month, 1).getDay() + 6) % 7; i++) add(grid, 'div');
          for (let d = 1; d <= monthDays(year, month); d++) {
            const cell = add(grid, 'section', undefined, 'weba-day'); add(cell, 'strong', String(d));
            const iso = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            cards.filter(c => c.dataset.due === iso).forEach(c => reportCard(c,cell,true));
          }
        }
        function shift(delta) { const date = new Date(year, month + delta, 1); year = date.getFullYear(); month = date.getMonth(); draw(); }
        previous.onclick = () => shift(-1); next.onclick = () => shift(1); draw();
        if (cards.some(c => !c.dataset.due)) add(report, 'h3', 'No due date');
        cards.filter(c => !c.dataset.due).forEach(c => reportCard(c,report,true));
      } else if (view === 'Charts') {
        add(report, 'h3', 'Cards by status');
        summary(cards.map(c => c.dataset)).forEach(({status,count}) => {
          const row = add(report, 'div', undefined, 'weba-chart-row'); add(row, 'span', `${['Todo','Doing','Done'].includes(status)?t(status):status}: ${count}`);
          const meter = add(row, 'meter'); meter.min = 0; meter.max = Math.max(cards.length,1); meter.value = count;
          meter.setAttribute('aria-label', `${t(status)}: ${count} ${t('Cards')}`);
        });
        add(report, 'p', `Total: ${cards.length} cards. Current counts, without inferred history.`);
      } else if (view === 'Table' || view === 'Gantt') {
        const table = add(report, 'table'), header = add(add(table, 'thead'), 'tr');
        ['Card','Status','Swimlane','Due date'].forEach(t => add(header, 'th', t));
        if (view === 'Gantt') add(header, 'th', 'Milestone');
        const body = add(table, 'tbody');
        cards.slice().sort((a,b) => view === 'Gantt' ? a.dataset.due.localeCompare(b.dataset.due) : 0).forEach(card => {
          const row = add(body, 'tr');
          reportCard(card,add(row,'td'));
          add(row,'td',card.dataset.status,undefined,['Todo','Doing','Done'].includes(card.dataset.status));
          add(row,'td',card.dataset.lane,undefined,false);
          add(row,'td',card.dataset.due || 'No due date');
          if (view === 'Gantt') add(add(row,'td'),'span',card.dataset.due || 'Unscheduled','weba-milestone');
        });
        if (view === 'Gantt') add(report,'p','Due-date milestones. Durations and dependencies are not recorded yet.');
      } else {
        if (!cards.length && !['Boards','Archive','Starred'].includes(view) && !data.querySelector('[data-board-key]')) add(report,'p','No cards. Open the page menu to create a board, then select it and add a card.');
        return;
      }
      root.webaDrag?.restoreCardFocus?.(section);
      root.webaDrag?.restoreListFocus?.(section);
      data.hidden = true;
    });
  }
  // Gambas calculates its focus outline from offsets; CSS-positioned panels
  // need the visible rectangle instead. Keep its native keyboard focus marker.
  function alignFocus() {
    if (!root.requestAnimationFrame) return;
    root.requestAnimationFrame(() => {
      let active = document.activeElement;
      // Embedded buttons/inputs have their own browser focus outline.
      if(active?.closest('.weba-content') && !active.id){
        const outline=document.getElementById('gw-focus');if(outline)outline.style.display='none';return;
      }
      while (active && (!active.id || active.id.includes(':'))) active = active.parentElement;
      const outline = document.getElementById('gw-focus');
      if (!active || !active.closest('.weba-shell') || !outline) return;
      const rect = active.getBoundingClientRect();
      if (!rect.width || !rect.height) { outline.style.display = 'none'; return; }
      Object.assign(outline.style, {left:(rect.left + root.scrollX)+'px', top:(rect.top + root.scrollY)+'px', width:rect.width+'px', height:rect.height+'px'});
    });
  }
  if (root.addEventListener && !root.webaFocusInstalled) {
    root.webaFocusInstalled = true;
    ['focusin','click'].forEach(event => document.addEventListener(event, alignFocus));
    root.addEventListener('resize', alignFocus);
    root.addEventListener('scroll', alignFocus, true);
  }
  root.webaAlignFocus = alignFocus;
  root.webaRender = render;
  if (typeof module !== 'undefined') module.exports = {summary, monthDays};
})(typeof window === 'undefined' ? globalThis : window);
