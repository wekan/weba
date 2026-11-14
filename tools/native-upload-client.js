/* Interactive filename metadata hook only; permissions stay in the model. */
(function(root){
 'use strict';
 if(root.webaNativeUploadNames)return;
 const cleanFileName=name=>root.webaFileNames.cleanFileName(name);
 const hook=/* WEKAN_ON_BEFORE_UPLOAD */;
 const emptyMessage=/* WEKAN_EMPTY_FILE_MESSAGE */;
 let localError=null;
 function before(name){const file={name};hook(file);return file.name;}
 function visible(element){for(let node=element;node;node=node.parentElement)if(node.hidden||node.classList.contains('gw-hidden')||root.getComputedStyle(node).display==='none')return false;return true;}
 function changed(event){
  const input=event.target;if(input?.ownerDocument!==root.document||input.tagName!=='INPUT'||input.type!=='file'||!input.id.endsWith('.DetailUpload:file')||!input.isConnected||input.disabled||input.files?.length!==1)return;
  const button=input.parentElement,panel=button?.closest('[id$=".DetailsPanel"]');if(button?.tagName!=='BUTTON'||button.id!==input.id.slice(0,-5)||!panel||!visible(panel)||button.disabled)return;
  const notice=root.document.getElementById(button.id.slice(0,-'.DetailUpload'.length)+'.Notice'),file=input.files[0];
  if(file.size<=0){event.preventDefault();event.stopImmediatePropagation();if(notice){notice.textContent=emptyMessage;localError={notice};}input.value='';return;}
  if(localError?.notice===notice&&notice?.textContent===emptyMessage)notice.textContent='';localError=null;
  if(!root.webaFileNames||!root.File||!root.DataTransfer)return;
  try{const name=before(file.name);if(name===file.name)return;const transfer=new root.DataTransfer();transfer.items.add(new root.File([file],name,{type:file.type,lastModified:file.lastModified}));input.files=transfer.files;}catch{}
 }
 root.webaNativeUploadNames=Object.freeze({before});
 root.document?.addEventListener('change',changed,true);
})(globalThis);
