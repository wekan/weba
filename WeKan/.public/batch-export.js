(()=>{
  const table=(()=>{const out=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;out[n]=c>>>0;}return out;})();
  const crc32=bytes=>{let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const u16=(view,at,value)=>view.setUint16(at,value,true);
  const u32=(view,at,value)=>view.setUint32(at,value>>>0,true);
  function stored(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1100)throw new Error('Invalid board export');
    const encoder=new TextEncoder(),prepared=[];let localSize=0;
    for(const entry of entries){
      if(!entry||typeof entry.name!=='string'||!entry.name||entry.name.startsWith('/')||entry.name.includes('..')||entry.name.includes('\\')||typeof entry.content!=='string')throw new Error('Invalid board export');
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
  function archive(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1000)throw new Error('Invalid board export');
    for(const entry of entries)if(!entry||typeof entry.name!=='string'||!/^board-[1-9][0-9]*\.(json|csv|tsv|md|leo|opml)$/.test(entry.name)||typeof entry.content!=='string')throw new Error('Invalid board export');
    return stored(entries);
  }
  function payload(encoded){
    if(typeof encoded!=='string'||encoded.length>300*1024*1024)throw new Error('Invalid board export');
    const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'�').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function uniqueSheetNames(titles){
    if(!Array.isArray(titles)||!titles.length||titles.length>1000)throw new Error('Invalid board export');
    const used=new Set();
    return titles.map(title=>{
      if(typeof title!=='string')throw new Error('Invalid board export');
      const base=title.replace(/[\\/?*\[\]:]/g,' ').replace(/\s+/g,' ').trim().replace(/^'+|'+$/g,'').trim()||'Board';
      let suffix='',number=1,name;
      do{suffix=number===1?'':` (${number})`;name=base.slice(0,31-suffix.length).trim()+suffix;number++;}while(used.has(name.toLowerCase()));
      used.add(name.toLowerCase());
      return name;
    });
  }
  const column=index=>{let out='';for(let value=index+1;value;value=Math.floor((value-1)/26))out=String.fromCharCode(65+(value-1)%26)+out;return out;};
  const cell=(number,index,value)=>`<c r="${column(index)}${number}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const row=(number,values)=>`<row r="${number}">${values.map((value,index)=>cell(number,index,value)).join('')}</row>`;
  const tr=key=>window.webaI18n&&typeof window.webaI18n.t==='function'?window.webaI18n.t(key):key;
  function worksheet(data){
    const rows=[row(1,[data.title]),row(2,[]),row(3,[tr('description'),data.description]),row(4,[]),row(5,[tr('created-at'),data.createdAt,tr('last-modified-at'),data.modifiedAt,tr('members'),data.boardMembers]),row(6,[]),row(7,data.headerKeys.map(tr))];
    data.rows.forEach((values,index)=>rows.push(row(index+8,values)));
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData><mergeCells count="3"><mergeCell ref="A1:H1"/><mergeCell ref="B3:H3"/><mergeCell ref="F5:R5"/></mergeCells></worksheet>`;
  }
  function workbook(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1000)throw new Error('Invalid board export');
    const descriptors=entries.map(entry=>{
      if(!entry||typeof entry.name!=='string'||!/^board-[1-9][0-9]*\.xlsx$/.test(entry.name)||typeof entry.content!=='string')throw new Error('Invalid board export');
      let data;
      try{data=JSON.parse(entry.content);}catch{throw new Error('Invalid board export');}
      for(const key of ['description','createdAt','modifiedAt','boardMembers'])if(data&&data[key]==null)data[key]='';
      if(!data||typeof data.title!=='string'||typeof data.description!=='string'||typeof data.createdAt!=='string'||typeof data.modifiedAt!=='string'||typeof data.boardMembers!=='string'||!Array.isArray(data.headerKeys)||data.headerKeys.length!==20||!data.headerKeys.every(value=>typeof value==='string')||!Array.isArray(data.rows)||!data.rows.every(values=>Array.isArray(values)&&values.length===20&&values.every(value=>typeof value==='string')))throw new Error('Invalid board export');
      return data;
    });
    const names=uniqueSheetNames(descriptors.map(data=>data.title));
    const sheets=names.map((name,index)=>`<sheet name="${xml(name)}" sheetId="${index+1}" r:id="rId${index+1}"/>`).join('');
    const relations=names.map((name,index)=>`<Relationship Id="rId${index+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index+1}.xml"/>`).join('');
    const overrides=names.map((name,index)=>`<Override PartName="/xl/worksheets/sheet${index+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
    const files=[
      {name:'[Content_Types].xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
      {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets}</sheets></workbook>`},
      {name:'xl/_rels/workbook.xml.rels',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relations}<Relationship Id="rId${names.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'xl/styles.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'}
    ];
    descriptors.forEach((data,index)=>files.push({name:`xl/worksheets/sheet${index+1}.xml`,content:worksheet(data)}));
    return stored(files);
  }
  function downloadPayload(encoded,filename='wekan-boards-weba.zip'){
    if(!/^wekan-boards-(weba|csv|scsv|tsv|kanboard|markdown|leo|opml)\.zip$/.test(filename))throw new Error('Invalid board export');
    const url=URL.createObjectURL(new Blob([archive(payload(encoded))],{type:'application/zip'})),link=document.createElement('a');
    link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadWorkbook(encoded){
    const url=URL.createObjectURL(new Blob([workbook(payload(encoded))],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');
    link.href=url;link.download='wekan-boards.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.webaBatchExport={archive,workbook,uniqueSheetNames,downloadPayload,downloadWorkbook};
})();
