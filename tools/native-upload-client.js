/* Interactive filename metadata hook only; permissions stay in the model. */
(function(root){
 'use strict';
 if(root.webaNativeUploadNames)return;
 const cleanFileName=name=>root.webaFileNames.cleanFileName(name);
 const hook=/* WEKAN_ON_BEFORE_UPLOAD */;
 function before(name){const file={name};hook(file);return file.name;}
 function visible(element){for(let node=element;node;node=node.parentElement)if(node.hidden||node.classList.contains('gw-hidden')||root.getComputedStyle(node).display==='none')return false;return true;}
 function changed(event){
  const input=event.target;if(!root.webaFileNames||!root.File||!root.DataTransfer||input?.ownerDocument!==root.document||input.tagName!=='INPUT'||input.type!=='file'||!input.id.endsWith('.DetailUpload:file')||!input.isConnected||input.disabled||input.files?.length!==1)return;
  const button=input.parentElement,panel=button?.closest('[id$=".DetailsPanel"]');if(button?.tagName!=='BUTTON'||button.id!==input.id.slice(0,-5)||!panel||!visible(panel)||button.disabled)return;
  try{const file=input.files[0],name=before(file.name);if(name===file.name)return;const transfer=new root.DataTransfer();transfer.items.add(new root.File([file],name,{type:file.type,lastModified:file.lastModified}));input.files=transfer.files;}catch{}
 }
 root.webaNativeUploadNames=Object.freeze({before});
 root.document?.addEventListener('change',changed,true);
})(globalThis);
