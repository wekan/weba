(()=>{
  const table=(()=>{const out=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;out[n]=c>>>0;}return out;})();
  const crc32=bytes=>{let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const u16=(view,at,value)=>view.setUint16(at,value,true);
  const u32=(view,at,value)=>view.setUint32(at,value>>>0,true);
  function archive(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1000)throw new Error('Invalid board export');
    const encoder=new TextEncoder(),prepared=[];let localSize=0;
    for(const entry of entries){
      if(!entry||typeof entry.name!=='string'||!/^board-[1-9][0-9]*\.(json|csv)$/.test(entry.name)||typeof entry.content!=='string')throw new Error('Invalid board export');
      const name=encoder.encode(entry.name),body=encoder.encode(entry.content);
      if(name.length>65535||body.length>0xffffffff-localSize)throw new Error('Board export is too large');
      prepared.push({name,body,crc:crc32(body),offset:localSize});localSize+=30+name.length+body.length;
    }
    let centralSize=0;for(const entry of prepared)centralSize+=46+entry.name.length;
    if(localSize+centralSize+22>0xffffffff)throw new Error('Board export is too large');
    const bytes=new Uint8Array(localSize+centralSize+22),view=new DataView(bytes.buffer);let at=0;
    for(const entry of prepared){
      u32(view,at,0x04034b50);u16(view,at+4,20);u16(view,at+6,0x0800);u16(view,at+8,0);u32(view,at+14,entry.crc);u32(view,at+18,entry.body.length);u32(view,at+22,entry.body.length);u16(view,at+26,entry.name.length);bytes.set(entry.name,at+30);bytes.set(entry.body,at+30+entry.name.length);at+=30+entry.name.length+entry.body.length;
    }
    const centralOffset=at;
    for(const entry of prepared){
      u32(view,at,0x02014b50);u16(view,at+4,20);u16(view,at+6,20);u16(view,at+8,0x0800);u16(view,at+10,0);u32(view,at+16,entry.crc);u32(view,at+20,entry.body.length);u32(view,at+24,entry.body.length);u16(view,at+28,entry.name.length);u32(view,at+42,entry.offset);bytes.set(entry.name,at+46);at+=46+entry.name.length;
    }
    u32(view,at,0x06054b50);u16(view,at+8,prepared.length);u16(view,at+10,prepared.length);u32(view,at+12,centralSize);u32(view,at+16,centralOffset);
    return bytes;
  }
  function payload(encoded){
    if(typeof encoded!=='string'||encoded.length>300*1024*1024)throw new Error('Invalid board export');
    const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  function downloadPayload(encoded,filename='wekan-boards-weba.zip'){
    if(!/^wekan-boards-(weba|csv|scsv)\.zip$/.test(filename))throw new Error('Invalid board export');
    const url=URL.createObjectURL(new Blob([archive(payload(encoded))],{type:'application/zip'})),link=document.createElement('a');
    link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.webaBatchExport={archive,downloadPayload};
})();
