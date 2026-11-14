/* Filename-only decoration for authorized native attachment tree rows. */
(function(root){
  'use strict';
  if(root.webaFileNameDisplay)return;
  const cache=new WeakMap();
  function visible(element){
    for(let node=element;node;node=node.parentElement){if(node.hidden||node.classList.contains('gw-hidden')||root.getComputedStyle(node).display==='none')return false;}
    return true;
  }
  function packet(state){
    const encoded=state.textContent||'';
    if(!encoded){cache.delete(state);return null;}
    const previous=cache.get(state);if(previous?.encoded===encoded)return previous.value;
    let value=null;
    try{
      const bytes=Uint8Array.from(root.atob(encoded),char=>char.charCodeAt(0)),data=JSON.parse(new root.TextDecoder('utf-8',{fatal:true}).decode(bytes));
      if(data?.v!==1||!Number.isSafeInteger(data.board)||data.board<=0||!Number.isSafeInteger(data.card)||data.card<=0||typeof data.tree!=='string'||!Array.isArray(data.rows))throw Error('Invalid filename scope');
      const rows=new Map();
      for(const row of data.rows){
        if(typeof row?.key!=='string'||! /^[fh][1-9]\d{0,9}$/.test(row.key)||Number(row.key.slice(1))>2147483647||rows.has(row.key)||typeof row.filename!=='string'||typeof row.prefix!=='string'||typeof row.suffix!=='string')throw Error('Invalid filename row');
        rows.set(row.key,row);
      }
      value={tree:data.tree,rows};
    }catch{}
    cache.set(state,{encoded,value});return value;
  }
  function renderGuest(){
    if(!root.webaFileNames)return;
    for(const label of root.document?.querySelectorAll('.weba-guest-board .weba-guest-attachment[data-file-id] .weba-guest-file-name[data-filename-text]')||[]){
      if(!label.isConnected||!visible(label))continue;
      let filename;
      try{const bytes=Uint8Array.from(root.atob(label.getAttribute('data-filename-text')),char=>char.charCodeAt(0));filename=JSON.parse(new root.TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{continue;}
      if(typeof filename!=='string')continue;
      const name=root.webaFileNames.cleanFileName(filename);
      if(label.textContent!==name)label.textContent=name;
      if(label.getAttribute('title')!==name)label.setAttribute('title',name);
    }
  }
  function render(){
    renderGuest();
    const state=root.document?.querySelector('[id$=".DetailFileNames"]');if(!state?.isConnected)return;
    const data=packet(state);if(!data||!root.webaFileNames)return;
    const expected=state.id.slice(0,-'.DetailFileNames'.length)+'.DetailTree';if(data.tree!==expected)return;
    const tree=root.document.getElementById(expected),panel=state.closest('[id$=".DetailsPanel"]');
    if(!tree?.isConnected||!panel||tree.closest('[id$=".DetailsPanel"]')!==panel||!visible(panel))return;
    for(const row of tree.querySelectorAll('tr[id]')){
      if(!row.id.startsWith(tree.id+':'))continue;
      let key;try{key=root.atob(row.id.slice(tree.id.length+1));}catch{continue;}
      const record=data.rows.get(key),label=row.querySelector('.gw-tree-text');if(!record||!label)continue;
      const name=root.webaFileNames.cleanFileName(record.filename),text=record.prefix+name+record.suffix;
      if(label.textContent!==text)label.textContent=text;
      if(label.getAttribute('title')!==name)label.setAttribute('title',name);
      for(const token of ['weba-file-name','weba-user-text'])if(!label.classList.contains(token))label.classList.add(token);
    }
  }
  root.webaFileNameDisplay=Object.freeze({render});
})(globalThis);
