/* MIT License. Preserve editable card fields across queued native initialization. */
(function(root){
  'use strict';
  if(root.webaNativeEditorStartup)return;
  const fields=new Set(['CardTitle','Description','Lane','Status','Assignee','Labels','DueDay']);
  const dirty=new Map(),state=root.webaNativeEditorStartup={starting:true};
  let responseCommand,opened=false;
  function context(){
    const raw=document.querySelector('[id$=".OverviewRouteState"]')?.textContent;
    try{const data=JSON.parse(raw);return data.cardId?String(data.boardId)+':'+String(data.cardId):null;}catch{return null;}
  }
  function editable(input){
    const editor=input?.closest('[id$=".Editor"]');
    if(!editor||input.matches(':disabled')||input.readOnly)return false;
    for(let node=input;node;node=node.parentElement){
      if(node.hidden||node.style.display==='none'||node.style.visibility==='hidden'||node.classList.contains('gw-hidden')||node.classList.contains('gw-disabled')||node.getAttribute('aria-hidden')==='true')return false;
    }
    return true;
  }
  function capture(event){
    const input=event.target,id=input.id?.replace(/:entry$/,'');
    if(!state.starting||!id||!fields.has(id.slice(id.lastIndexOf('.')+1))||!editable(input))return;
    const owner=context();if(owner)dirty.set(id,{input,owner,value:input.value});
  }
  document.addEventListener('input',capture,true);
  function install(){
    const gw=root.gw;if(!gw?.setOuterHtml||!gw.answer)return;
    function startupResponse(){
      if(!responseCommand)return true;
      if(responseCommand[0]==='raise'&&responseCommand[1]===null&&responseCommand[2]==='open')return true;
      if(responseCommand[0]!=='update'||!responseCommand[1]?.endsWith('.EntryRouteAction'))return false;
      const target=String(responseCommand[3]).split('|');
      return target.length===4&&target[0]==='board'&&target[2]+':'+target[3]===context();
    }
    const outer=gw.setOuterHtml;
    gw.setOuterHtml=function(id,html){
      if(!state.starting||!startupResponse())return outer.call(this,id,html);
      const target=document.getElementById(id),owner=context(),saved=[];
      if(target&&owner)for(const input of [...(target.matches('input,textarea')?[target]:[]),...target.querySelectorAll('input,textarea')]){
        const name=input.id.replace(/:entry$/,''),field=name.slice(name.lastIndexOf('.')+1);
        if(!fields.has(field)||!editable(input))continue;
        const held=dirty.get(name);
        if(held&&held.input===input&&held.owner===owner)saved.push({name,value:held.value,dirty:true});
        else{
          const marker=[...document.querySelectorAll('.weba-native-text')].find(node=>node.dataset.field===name);
          if(marker){try{const value=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(marker.dataset.text),c=>c.charCodeAt(0))));if(typeof value==='string')saved.push({name,value});}catch{}}
        }
      }
      const result=outer.call(this,id,html);
      if(context()===owner)for(const item of saved){
        const input=document.getElementById(item.name+':entry')||document.getElementById(item.name);
        if(!editable(input))continue;
        input.value=item.value;
        if(item.dirty){
          dirty.set(item.name,{input,owner,value:item.value});
          gw[input.tagName==='TEXTAREA'?'textarea':'textbox'].onUpdate(item.name);
        }
      }
      return result;
    };
    const answer=gw.answer;
    gw.answer=function(xhr,...args){
      if(!state.starting)return answer.call(this,xhr,...args);
      const previous=responseCommand;responseCommand=xhr.gw_command;
      try{return answer.call(this,xhr,...args);}finally{
        if(xhr.readyState===4&&responseCommand?.[0]==='raise'&&responseCommand[1]===null&&responseCommand[2]==='open')opened=true;
        responseCommand=previous;
        if(opened&&!gw.commands.length){state.starting=false;dirty.clear();document.removeEventListener('input',capture,true);}
      }
    };
  }
  if(root.gw)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})(window);
