/* Interactive filename metadata hook only; permissions stay in the model. */
(function(root){
 'use strict';
 if(root.webaNativeUploadNames)return;
 const cleanFileName=name=>root.webaFileNames.cleanFileName(name);
 const hook=function(file) {
    // SECURITY: Sanitize filename to prevent path traversal attacks
    if (file.name && typeof file.name === 'string') {
      // Strip directory components (client-safe alternative to path.basename)
      let safeName = file.name.split(/[\\/]/).pop();
      // Remove null bytes
      safeName = safeName.replace(/\0/g, '');
      // Remove path traversal sequences (repeat until stable to avoid incomplete multi-character sanitization)
      let previousSafeName;
      do {
        previousSafeName = safeName;
        safeName = safeName.replace(/\.\.[\\/]/g, '');
      } while (safeName !== previousSafeName);
      safeName = safeName.replace(/^\.\.$/g, '');
      safeName = safeName.trim();

      // If sanitization changed the name, update it
      if (safeName && safeName !== '.' && safeName !== '..' && safeName !== file.name) {
        file.name = safeName;
      } else if (!safeName || safeName === '.' || safeName === '..') {
        file.name = 'unnamed';
      }
      // Apply the same plain-text and classic Amiga FFS 30-character policy
      // before bytes leave the client. Content-derived extension correction is
      // repeated authoritatively on the server after its bounded header sniff.
      file.name = cleanFileName(file.name) || 'unnamed';
    }

    // SVG is allowed (#6802, maintainer decision 2026-10-25): every uploaded SVG
    // is sanitized on the server before it is stored - no script, event handler,
    // javascript: URI, foreignObject or DOCTYPE/ENTITY XML loop
    // (models/lib/sanitizeUploadedFile.js) - and sanitized again whenever it is
    // served, inline under a script-free sandbox (server/lib/svgResponse.js).
    // It used to be refused here after JVN#74210258.

    return true;
  };
 const emptyMessage="Can't upload empty file";
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
