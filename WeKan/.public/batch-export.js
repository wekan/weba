(()=>{
  const table=(()=>{const out=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;out[n]=c>>>0;}return out;})();
  const crc32=bytes=>{let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const u16=(view,at,value)=>view.setUint16(at,value,true);
  const u32=(view,at,value)=>view.setUint32(at,value>>>0,true);
  function stored(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1100)throw new Error('Invalid board export');
    const encoder=new TextEncoder(),prepared=[];let localSize=0;
    for(const entry of entries){
      const byteContent=entry&&entry.bytes instanceof Uint8Array;
      if(!entry||typeof entry.name!=='string'||!entry.name||entry.name.startsWith('/')||entry.name.includes('..')||entry.name.includes('\\')||(!byteContent&&typeof entry.content!=='string'))throw new Error('Invalid board export');
      const name=encoder.encode(entry.name),body=byteContent?entry.bytes:encoder.encode(entry.content);
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
    const normalized=[];
    for(const entry of entries){
      if(!entry||typeof entry.name!=='string'||!/^board-[1-9][0-9]*\.(json|jsonl|csv|tsv|md|leo|opml|org|txt|xlsx|nbx|zip)$/.test(entry.name))throw new Error('Invalid board export');
      if(entry.format!==undefined&&!((['taiga','wrikeworkflow'].includes(entry.format)&&entry.name.endsWith('.json'))||(entry.format==='vikunja'&&entry.name.endsWith('.zip'))))throw new Error('Invalid board export');
      if(entry.name.endsWith('.zip')){
        if(entry.format!=='vikunja'||typeof entry.content!=='string')throw new Error('Invalid board export');
        let descriptor;try{descriptor=JSON.parse(entry.content);}catch{throw new Error('Invalid board export');}
        normalized.push({name:entry.name,bytes:vikunjaArchive(descriptor)});continue;
      }
      if(entry.name.endsWith('.xlsx')){
        if(typeof entry.content!=='string')throw new Error('Invalid board export');
        let descriptor;try{descriptor=JSON.parse(entry.content);}catch{throw new Error('Invalid board export');}
        normalized.push({name:entry.name,bytes:descriptor&&descriptor.format==='teamwork'?teamworkWorkbook(descriptor):descriptor&&descriptor.format==='wrike'?wrikeWorkbook(descriptor):descriptor&&descriptor.format==='businessmap'?businessmapWorkbook(descriptor):descriptor&&descriptor.format==='monday'?mondayWorkbook(descriptor):plannerWorkbook(descriptor)});continue;
      }
      let content=entry.content==null&&entry.name.endsWith('.txt')?'':entry.content;
      if(entry.format!==undefined){
        if(!['taiga','wrikeworkflow'].includes(entry.format)||!entry.name.endsWith('.json')||typeof content!=='string')throw new Error('Invalid board export');
        let descriptor;try{descriptor=JSON.parse(content);}catch{throw new Error('Invalid board export');}
        content=JSON.stringify(entry.format==='wrikeworkflow'?wrikeWorkflowData(descriptor):taigaData(descriptor))+'\n';
      }
      if(typeof content!=='string')throw new Error('Invalid board export');
      normalized.push({name:entry.name,content});
    }
    return stored(normalized);
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
  const plannerHeaders=['Task ID','Task Name','Bucket Name','Progress','Priority','Assigned To','Created By','Created Date','Start Date','Due Date','Late','Completed Date','Completed By','Description','Completed Checklist Items','Checklist Items','Labels'];
  function plannerWorkbook(data){
    if(!data||data.sheet!=='Tasks'||!Array.isArray(data.rows)||data.rows.length<5||data.rows.length>20005)throw new Error('Invalid board export');
    const rows=data.rows;
    if(!rows.slice(0,3).every(values=>Array.isArray(values)&&values.length===2&&values.every(value=>typeof value==='string'))||rows[0][0]!=='Plan name'||rows[1][0]!=='Plan ID'||!/^[1-9][0-9]*$/.test(rows[1][1])||rows[2][0]!=='Date of export'||!Array.isArray(rows[3])||rows[3].length||!Array.isArray(rows[4])||rows[4].length!==plannerHeaders.length||!rows[4].every((value,index)=>value===plannerHeaders[index])||!rows.slice(5).every(values=>Array.isArray(values)&&values.length===plannerHeaders.length&&values.every(value=>typeof value==='string'))||!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/.test(rows[2][1]))throw new Error('Invalid board export');
    const plannerCell=(number,index,value,bold)=>`<c r="${column(index)}${number}" t="inlineStr"${bold?' s="1"':''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    const plannerRows=rows.map((values,index)=>`<row r="${index+1}">${values.map((value,cellIndex)=>plannerCell(index+1,cellIndex,value,index===4)).join('')}</row>`).join('');
    const files=[
      {name:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
      {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tasks" sheetId="1" r:id="rId1"/></sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
      {name:'xl/styles.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'},
      {name:'xl/worksheets/sheet1.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${plannerRows}</sheetData></worksheet>`}
    ];
    return stored(files);
  }
  const mondayHeaders=['Name','Group','Status','Person','Date','Timeline','Tags','Priority','Description','Item ID'];
  function mondayData(data){
    if(!data||Object.keys(data).sort().join(',')!=='format,rows,title'||data.format!=='monday'||typeof data.title!=='string'||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>1048576)throw new Error('Invalid board export');
    const header=data.rows[0];
    if(!Array.isArray(header)||header.length<10||header.length>16384||!mondayHeaders.every((key,index)=>header[index]===key)||!header.every(key=>typeof key==='string')||new Set(header).size!==header.length)throw new Error('Invalid board export');
    const rows=data.rows.map((values,rowIndex)=>{
      if(!Array.isArray(values)||values.length!==header.length)throw new Error('Invalid board export');
      return values.map((value,index)=>{
        if(value&&typeof value==='object'){
          if(Array.isArray(value)||Object.keys(value).join(',')!=='number'||typeof value.number!=='string'||!Number.isFinite(Number(value.number)))throw new Error('Invalid board export');
          value=Number(value.number);
        }
        if(value==null)value='';
        if(!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value)||rowIndex===0&&typeof value!=='string')throw new Error('Invalid board export');
        return rowIndex>0&&index===7?String(value):value;
      });
    });
    let name=(data.title||'board').toLowerCase().slice(0,31);
    name=String(name||'sheet1').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'sheet1';
    if(name.startsWith("'")||name.endsWith("'"))throw new Error('Invalid board export');
    return {name,rows};
  }
  function mondayWorkbook(data){return typedWorkbook(mondayData(data));}
  function typedWorkbook({name,rows,dateColumns=[]}){
    const dateAt=new Set(dateColumns);
    const mondayXml=value=>xml(String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,''));
    const shared=[],indices=new Map();let stringCount=0;
    const stringIndex=value=>{stringCount++;if(!indices.has(value)){indices.set(value,shared.length);shared.push(value);}return indices.get(value);};
    const mondayRows=rows.map((values,index)=>`<row r="${index+1}">${values.map((value,cellIndex)=>{
      const style=dateAt.has(cellIndex)?(index===0?3:2):(index===0?1:0);
      const attrs=`r="${column(cellIndex)}${index+1}"${style?` s="${style}"`:''}`;
      if(value instanceof Date){if(!Number.isFinite(value.getTime()))throw new Error('Invalid board export');return `<c ${attrs} t="n"><v>${25569+value.getTime()/86400000}</v></c>`;}
      if(typeof value==='number')return `<c ${attrs} t="n"><v>${value}</v></c>`;
      if(typeof value==='boolean')return `<c ${attrs} t="b"><v>${value?1:0}</v></c>`;
      return `<c ${attrs} t="s"><v>${stringIndex(value)}</v></c>`;
    }).join('')}</row>`).join('');
    const files=[
      {name:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'},
      {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${mondayXml(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
      {name:'xl/_rels/workbook.xml.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'},
      {name:'xl/styles.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'},
      {name:'xl/worksheets/sheet1.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${mondayRows}</sheetData></worksheet>`}
    ];
    if(dateColumns.length){
      const styles=files.find(file=>file.name==='xl/styles.xml');
      styles.content=styles.content.replace('<fonts count="2">','<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2">').replace('<cellXfs count="2">','<cellXfs count="4">').replace('</cellXfs>','<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>');
      const sheet=files.find(file=>file.name==='xl/worksheets/sheet1.xml');sheet.content=sheet.content.replace('<sheetData>',`<cols>${dateColumns.map(index=>`<col min="${index+1}" max="${index+1}" style="2"/>`).join('')}</cols><sheetData>`);
    }
    files.push({name:'xl/sharedStrings.xml',content:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringCount}" uniqueCount="${shared.length}">${shared.map(value=>`<si><t xml:space="preserve">${mondayXml(value)}</t></si>`).join('')}</sst>`});
    return stored(files);
  }
const ROLES = [
  ['title', /^title$/i],
  ['description', /^description$/i],
  ['cardId', /^card id$/i],
  ['customId', /^custom card id$/i],
  ['priority', /^priority$/i],
  ['owner', /^owner$/i],
  ['coOwners', /^co-?owners?$/i],
  ['color', /^colou?r$/i],
  ['size', /^size$/i],
  ['tags', /^tags?$/i],
  ['deadline', /^deadline$/i],
  ['template', /^template$/i],
  ['type', /^type( name)?$/i],
  ['column', /^column( name)?$/i],
  ['lane', /^lane( name)?$/i],
  ['workflow', /^workflow name$/i],
  ['boardName', /^board name$/i],
  ['boardId', /^board id$/i],
  ['comment', /^comments?( \d+)?$/i],
  ['links', /^links$/i],
  ['parent', /^parent( card id)?$/i],
  ['created', /^(created at|creation date)$/i],
  ['archived', /^(archived at|archivation date)$/i],
  ['start', /^start date$/i],
  ['end', /^end date$/i],
  ['plannedStart', /^planned start$/i],
  ['plannedEnd', /^planned end$/i],
  ['track', /^track$/i],
];
// The roles whose column also names a WeKan custom field.
const FIELD_OF_ROLE = {
  cardId: 'Card ID', customId: 'Custom Card ID', priority: 'Priority', size: 'Size', type: 'Type',
  workflow: 'Workflow name', plannedStart: 'Planned Start', plannedEnd: 'Planned End', track: 'Track',
};
const businessmapRole = title => (ROLES.find(([, re]) => re.test(String(title || '').trim())) || [])[0];

const NAMED_COLOR_HEX = {
  white: '#ffffff',
  green: '#3cb500',
  yellow: '#fad900',
  orange: '#ff9f19',
  red: '#eb4646',
  purple: '#a632db',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#4d4d4d',
  silver: '#c0c0c0',
  peachpuff: '#ffdab9',
  crimson: '#dc143c',
  plum: '#dda0dd',
  darkgreen: '#006400',
  slateblue: '#6a5acd',
  magenta: '#ff00ff',
  gold: '#ffd700',
  navy: '#000080',
  gray: '#808080',
  saddlebrown: '#8b4513',
  paleturquoise: '#afeeee',
  mistyrose: '#ffe4e1',
  indigo: '#4b0082',
};

const day = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
const PRIORITY_SYNONYMS = {
  low: 'low', lowest: 'low', minor: 'low',
  average: 'average', medium: 'average', normal: 'average',
  high: 'high', major: 'high',
  critical: 'critical', urgent: 'critical', highest: 'critical', blocker: 'critical',
};
// A custom field value as one spreadsheet cell.
const cellValue = value => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return day(value);
  if (Array.isArray(value)) return value.map(cellValue).filter(v => v !== '').join(', ');
  return '';
};
const ROLE_FIELDS = new Set(Object.values(FIELD_OF_ROLE));

// The documented import columns on the first sheet, header in row 1: what
// Businessmap's import reads (at most 100 cards per run, so a larger board is
// imported there in parts). Card ID and Parent are written only from the
// Card ID custom field an import from Businessmap keeps, because a Card ID
// updates that existing Businessmap card; WeKan's own ids are not Businessmap
// ids. Columns no card has a value for are left out, other custom fields
// follow by name, and comments go to repeated Comment columns.
function formatBusinessmapSheets({ board, items }) {
  const list = Array.isArray(items) ? items : [];
  const cardIdOf = new Map(list.map(item => [item.cardId, (item.customFields || {})['Card ID']]));
  const rows = list.map(item => {
    const fields = item.customFields || {};
    const color = typeof item.color === 'string'
      ? (/^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color.toUpperCase() : (NAMED_COLOR_HEX[item.color] || '').toUpperCase()) : '';
    const labels = (Array.isArray(item.labels) ? item.labels : []).map(tag => String(tag).replace(/,/g, ' ').trim()).filter(Boolean);
    const size = Number(fields.Size);
    const parentId = item.parentCardId ? cardIdOf.get(item.parentCardId) : undefined;
    return {
      'Card ID': fields['Card ID'] ?? '',
      'Custom Card ID': fields['Custom Card ID'] ?? '',
      Title: String(item.title || '').trim() || 'Untitled',
      Description: item.description || '',
      Column: item.listTitle || '',
      Lane: item.swimlaneTitle && item.swimlaneTitle !== 'Default' ? item.swimlaneTitle : '',
      'Workflow name': fields['Workflow name'] ?? '',
      Owner: item.owner || '',
      'Co-Owners': (Array.isArray(item.assignees) ? item.assignees : []).filter(Boolean).join(', '),
      Priority: PRIORITY_SYNONYMS[String(fields.Priority ?? '').trim().toLowerCase()] || '',
      Color: color,
      Size: fields.Size !== undefined && fields.Size !== '' && Number.isFinite(size) && size >= 0 ? size : '',
      // A lone tag with a space keeps a trailing comma, so it is not split.
      Tags: labels.length === 1 && /\s/.test(labels[0]) ? `${labels[0]},` : labels.join(', '),
      Deadline: day(item.dueAt),
      'Start Date': day(item.startAt),
      'End Date': day(item.endAt),
      Type: fields.Type ?? '',
      'Planned Start': fields['Planned Start'] ?? '',
      'Planned End': fields['Planned End'] ?? '',
      Track: fields.Track ?? '',
      Parent: parentId ?? '',
      comments: (Array.isArray(item.comments) ? item.comments : [])
        .map(c => String((c && c.text) || '').trim() && (c.author ? `${c.author}: ${String(c.text).trim()}` : String(c.text).trim()))
        .filter(Boolean),
      extra: Object.fromEntries(Object.entries(fields)
        .filter(([name]) => !ROLE_FIELDS.has(name) && !businessmapRole(name))
        .map(([name, value]) => [name, cellValue(value)])),
    };
  });
  const always = ['Title', 'Description', 'Column', 'Lane', 'Owner', 'Co-Owners', 'Tags', 'Deadline', 'Color'];
  const optional = ['Card ID', 'Custom Card ID', 'Workflow name', 'Priority', 'Size', 'Type', 'Start Date', 'End Date', 'Planned Start', 'Planned End', 'Track', 'Parent'];
  const order = ['Card ID', 'Custom Card ID', 'Title', 'Description', 'Workflow name', 'Column', 'Lane', 'Owner', 'Co-Owners',
    'Priority', 'Color', 'Size', 'Tags', 'Deadline', 'Start Date', 'End Date', 'Type', 'Planned Start', 'Planned End', 'Track', 'Parent'];
  const named = order.filter(name => always.includes(name) || (optional.includes(name) && rows.some(row => row[name] !== '')));
  const extra = [];
  rows.forEach(row => Object.keys(row.extra).forEach(name => { if (!extra.includes(name)) extra.push(name); }));
  const commentColumns = Math.max(0, ...rows.map(row => row.comments.length));
  const header = [...named, ...Array(commentColumns).fill('Comment'), ...extra];
  const out = [header];
  for (const row of rows) {
    out.push([
      ...named.map(name => row[name]),
      ...Array.from({ length: commentColumns }, (_, i) => row.comments[i] || ''),
      ...extra.map(name => (row.extra[name] === undefined ? '' : row.extra[name])),
    ]);
  }
  return { sheets: [{ name: String((board && board.title) || 'Cards').slice(0, 31), rows: out }] };
}

  function businessmapData(data){
    if(!data||Object.keys(data).sort().join(',')!=='format,items,title'||data.format!=='businessmap'||typeof data.title!=='string'||!Array.isArray(data.items)||data.items.length>1048575)throw new Error('Invalid board export');
    const keys='assignees,cardId,color,comments,customFields,description,dueAt,endAt,labels,listTitle,owner,parentCardId,startAt,swimlaneTitle,title',ids=new Set();
    const items=data.items.map(item=>{
      if(!item||Object.keys(item).sort().join(',')!==keys||!['cardId','title','description','swimlaneTitle','listTitle','color','owner','parentCardId','dueAt','startAt','endAt'].every(key=>typeof item[key]==='string')||!/^[1-9][0-9]*$/.test(item.cardId)||ids.has(item.cardId)||item.parentCardId&&!/^[1-9][0-9]*$/.test(item.parentCardId))throw new Error('Invalid board export');ids.add(item.cardId);
      for(const key of ['assignees','labels'])if(!Array.isArray(item[key])||!item[key].every(value=>typeof value==='string'))throw new Error('Invalid board export');
      if(!Array.isArray(item.comments)||!item.comments.every(comment=>comment&&Object.keys(comment).sort().join(',')==='author,text'&&typeof comment.author==='string'&&typeof comment.text==='string')||!item.customFields||Array.isArray(item.customFields)||typeof item.customFields!=='object')throw new Error('Invalid board export');
      const customFields=Object.create(null);
      for(let [name,value] of Object.entries(item.customFields)){
        if(value&&typeof value==='object'){
          if(Array.isArray(value)||Object.keys(value).join(',')!=='number'||typeof value.number!=='string'||!value.number.trim()||!Number.isFinite(Number(value.number)))throw new Error('Invalid board export');value=Number(value.number);
        }
        if(!['string','boolean','number'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))throw new Error('Invalid board export');customFields[name]=value;
      }
      for(const key of ['dueAt','startAt','endAt'])if(item[key]&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item[key])||!Number.isFinite(Date.parse(item[key]))))throw new Error('Invalid board export');
      return {...item,customFields};
    });
    const sheet=formatBusinessmapSheets({board:{title:data.title},items}).sheets[0];
    let name=String(sheet.name||'sheet1').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'sheet1';
    if(name==='History'||name.startsWith("'")||name.endsWith("'")||sheet.rows[0].length>16384)throw new Error('Invalid board export');
    return {name,rows:sheet.rows};
  }
  function businessmapWorkbook(data){return typedWorkbook(businessmapData(data));}


  const nativeSnapshot=(()=>{
    const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
    const textArray=value=>Array.isArray(value)&&value.every(item=>typeof item==='string');
    const dateText=value=>typeof value==='string'&&(!value||/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);
    const canonical=value=>typeof value==='string'&&/^[1-9][0-9]*$/.test(value);
    return function(data,format){
      if(!['taiga','vikunja','wrike','teamwork'].includes(format))throw new Error('Invalid board export');
      if(!exact(data,'board,format,items,lists,now,swimlanes')||data.format!==format||!dateText(data.now)||!data.now||!exact(data.board,'description,title')||typeof data.board.title!=='string'||typeof data.board.description!=='string'||!Array.isArray(data.items)||data.items.length>(['vikunja','teamwork'].includes(format)?20000:format==='wrike'?65000:50000)||!Array.isArray(data.lists)||!Array.isArray(data.swimlanes))throw new Error('Invalid board export');
      const listIds=new Set(),cardIds=new Set();
      for(const item of data.lists){
        if(!exact(item,'_id,color,title,wipLimit')||!canonical(item._id)||listIds.has(item._id)||typeof item.color!=='string'||typeof item.title!=='string'||!exact(item.wipLimit,'enabled,value')||typeof item.wipLimit.enabled!=='boolean'||typeof item.wipLimit.value!=='number'||!Number.isFinite(item.wipLimit.value)||item.wipLimit.value<0)throw new Error('Invalid board export');listIds.add(item._id);
      }
      for(const lane of data.swimlanes)if(!exact(lane,'title')||typeof lane.title!=='string')throw new Error('Invalid board export');
      const items=data.items.map(item=>{
        if(!exact(item,(['vikunja','wrike','teamwork'].includes(format)?'assignees,cardId,checklists,color,comments,creator,customFields,description,dueAt,endAt,labels,listId,listTitle,owner,parentCardId,startAt,swimlaneTitle,title':'assignees,cardId,checklists,color,comments,creator,customFields,description,dueAt,endAt,labels,listId,listTitle,owner,parentCardId,swimlaneTitle,title'))||!['cardId','title','description','listId','listTitle','swimlaneTitle','color','creator','owner','parentCardId'].every(key=>typeof item[key]==='string')||!canonical(item.cardId)||cardIds.has(item.cardId)||item.listId&&!canonical(item.listId)||item.parentCardId&&!canonical(item.parentCardId)||!dateText(item.dueAt)||!dateText(item.endAt)||['vikunja','wrike','teamwork'].includes(format)&&!dateText(item.startAt)||!textArray(item.assignees)||!textArray(item.labels)||!Array.isArray(item.comments)||!Array.isArray(item.checklists)||!item.customFields||typeof item.customFields!=='object'||Array.isArray(item.customFields))throw new Error('Invalid board export');cardIds.add(item.cardId);
        for(const comment of item.comments)if(!exact(comment,'author,date,text')||typeof comment.author!=='string'||typeof comment.text!=='string'||!dateText(comment.date))throw new Error('Invalid board export');
        for(const checklist of item.checklists)if(!exact(checklist,'items,title')||typeof checklist.title!=='string'||!Array.isArray(checklist.items)||!checklist.items.every(entry=>exact(entry,'done,title')&&typeof entry.title==='string'&&typeof entry.done==='boolean'))throw new Error('Invalid board export');
        const customFields=Object.create(null);
        for(let [name,value] of Object.entries(item.customFields)){
          if(value&&typeof value==='object'){
            if(!exact(value,'number')||typeof value.number!=='string'||!value.number.trim()||!Number.isFinite(Number(value.number)))throw new Error('Invalid board export');value=Number(value.number);
          }
          if(!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))throw new Error('Invalid board export');customFields[name]=value;
        }
        return {...item,customFields};
      });
      return {board:data.board,lists:data.lists,swimlanes:data.swimlanes,items};
    };
  })();

  // Taiga export semantics are isolated from other format helpers.
  const taigaData=(()=>{
const TAIGA_EPICS_SWIMLANE = 'Epics';
const TAIGA_ISSUES_SWIMLANE = 'Issues';
const TAIGA_UNCLASSIFIED_SWIMLANE = 'Unclassified';
const TAIGA_FIELDS = {
  points: 'Story points',
  taskStatus: 'Task status',
  blocked: 'Blocked',
  client: 'Client requirement',
  team: 'Team requirement',
  dueReason: 'Due date reason',
  iocaine: 'Iocaine',
};
const MAX_TAIGA_ITEMS = 50000;

// WeKan's label palette (client/components/cards/labels.css), so a Taiga tag
// color finds its nearest label color and a label goes back with its hex.
const WEKAN_LABEL_HEX = {
  white: '#ffffff', green: '#3cb500', yellow: '#fad900', orange: '#ff9f19', red: '#eb4646',
  purple: '#a632db', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898', pink: '#ff78cb',
  black: '#4d4d4d', silver: '#c0c0c0', peachpuff: '#ffdab9', crimson: '#dc143c', plum: '#dda0dd',
  darkgreen: '#006400', slateblue: '#6a5acd', magenta: '#ff00ff', gold: '#ffd700', navy: '#000080',
  gray: '#808080', saddlebrown: '#8b4513', paleturquoise: '#afeeee', mistyrose: '#ffe4e1', indigo: '#4b0082',
};

const list = value => (Array.isArray(value) ? value : []);
const str = value => (typeof value === 'string' ? value : '');
const has = value => value !== undefined && value !== null && value !== '';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const person = value => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const uniq = values => [...new Set(values.filter(Boolean))];
const byOrder = (a, b) => (num(a && a.order) ?? 0) - (num(b && b.order) ?? 0);

function taigaDateTimeText(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toISOString().slice(0, 19)}+0000`;
}

const dayText=value=>{const text=taigaDateTimeText(value);return text?text.slice(0,10):null;};
const TASK_STATUSES = [['New', false], ['In progress', false], ['Ready for test', true], ['Closed', true], ['Needs Info', false]];
const ISSUE_STATUSES = [['New', false], ['In progress', false], ['Ready for test', true], ['Closed', true],
  ['Needs Info', false], ['Rejected', true], ['Postponed', false]];
const EPIC_STATUSES = [['New', false], ['Ready', false], ['In progress', false], ['Ready for test', false], ['Done', true]];
const ISSUE_TYPES = ['Bug', 'Question', 'Enhancement'];
const PRIORITIES = ['Low', 'Normal', 'High'];
const SEVERITIES = ['Wishlist', 'Minor', 'Normal', 'Important', 'Critical'];
const ROLE = 'Team';
const ROLE_PERMISSIONS = ['view_project', 'view_milestones', 'add_milestone', 'modify_milestone', 'delete_milestone',
  'view_epics', 'add_epic', 'modify_epic', 'comment_epic', 'delete_epic',
  'view_us', 'add_us', 'modify_us', 'comment_us', 'delete_us',
  'view_tasks', 'add_task', 'modify_task', 'comment_task', 'delete_task',
  'view_issues', 'add_issue', 'modify_issue', 'comment_issue', 'delete_issue',
  'view_wiki_pages', 'add_wiki_page', 'modify_wiki_page', 'comment_wiki_page', 'delete_wiki_page',
  'view_wiki_links', 'add_wiki_link', 'modify_wiki_link', 'delete_wiki_link'];
const CLOSED_LIST = /done|closed|complete|archiv|finished/i;
const STATUS_COLOR = '#70728F';
const FACETS = ['type', 'priority', 'severity'];

function taigaSlug(text, used = new Set()) {
  const base = String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

function uniqueName(name, used) {
  const base = String(name || '').trim() || 'Untitled';
  let out = base;
  for (let n = 2; used.has(out); n += 1) out = `${base} (${n})`;
  used.add(out);
  return out;
}

const hexColor = color => {
  if (typeof color !== 'string') return null;
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  return WEKAN_LABEL_HEX[color.toLowerCase()] || null;
};

const attributeValue = value => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'string') return value;
  return undefined;
};

function checklistMarkdown(checklists) {
  return list(checklists).filter(c => list(c.items).length).map(c => [
    `### ${str(c.title).trim() || 'Checklist'}`,
    ...list(c.items).map(item => `- [${item.done ? 'x' : ' '}] ${str(item.title)}`),
  ].join('\n')).join('\n\n');
}

function history(comments, now) {
  return list(comments).filter(c => str(c.text).trim()).map(c => ({
    user: c.author ? [c.author, c.author] : [],
    diff: {}, snapshot: null, values: {},
    comment: c.text,
    delete_comment_date: null, delete_comment_user: [], comment_versions: null,
    created_at: taigaDateTimeText(c.date) || taigaDateTimeText(now),
    edit_comment_date: null, is_hidden: false, is_snapshot: false, type: 1,
  }));
}

function statusRows(rows) {
  const slugs = new Set();
  return rows.map(([name, closed], index) => ({ name, slug: taigaSlug(name, slugs), order: index + 1,
    is_closed: closed, color: STATUS_COLOR }));
}

function addStatus(rows, name, closed = CLOSED_LIST.test(name)) {
  if (name && !rows.some(row => row[0] === name)) rows.push([name, closed]);
}

// The dump for a collected board ({ board, lists, swimlanes, items,
// scrumSprints }, models/lib/externalExporters.js).
function formatTaiga({ board, lists, swimlanes, items, scrumSprints } = {}, now = new Date()) {
  const all = list(items);
  const nowText = taigaDateTimeText(now);
  const byCard = new Map(all.map(item => [item.cardId, item]));

  // What each card is: epic and issue by swimlane, task by its parent.
  const kinds = new Map();
  const kindOf = (item, seen = new Set()) => {
    if (kinds.has(item.cardId)) return kinds.get(item.cardId);
    let kind = 'story';
    if (item.swimlaneTitle === TAIGA_EPICS_SWIMLANE) kind = 'epic';
    else if (item.swimlaneTitle === TAIGA_ISSUES_SWIMLANE) kind = 'issue';
    else {
      const parent = item.parentCardId && byCard.get(item.parentCardId);
      seen.add(item.cardId);
      if (parent && !seen.has(parent.cardId) && ['story', 'task'].includes(kindOf(parent, seen))) kind = 'task';
    }
    kinds.set(item.cardId, kind);
    return kind;
  };
  all.forEach(item => kindOf(item));
  const storyOf = item => {
    let current = item;
    const seen = new Set();
    while (current && kinds.get(current.cardId) === 'task' && !seen.has(current.cardId)) {
      seen.add(current.cardId);
      current = byCard.get(current.parentCardId);
    }
    return current && kinds.get(current.cardId) === 'story' ? current : null;
  };

  // Refs: one sequence for the whole project, as Taiga numbers them.
  const refs = new Map();
  let nextRef = 1;
  for (const kind of ['epic', 'story', 'task', 'issue']) {
    all.filter(item => kinds.get(item.cardId) === kind).forEach(item => { refs.set(item.cardId, nextRef); nextRef += 1; });
  }

  // Statuses: lists for stories; Taiga's defaults plus what is used for the rest.
  const usedStatusNames = new Set();
  const usStatusByList = new Map();
  const usStatuses = list(lists).map((l, index) => {
    const name = uniqueName(l.title, usedStatusNames);
    usStatusByList.set(l._id, name);
    const wip = l.wipLimit && l.wipLimit.enabled && num(l.wipLimit.value) > 0 ? l.wipLimit.value : null;
    return { name, slug: '', order: index + 1, is_closed: CLOSED_LIST.test(name), is_archived: false,
      color: hexColor(l.color) || STATUS_COLOR, wip_limit: wip };
  });
  if (!usStatuses.length) usStatuses.push({ name: 'New', slug: '', order: 1, is_closed: false, is_archived: false, color: STATUS_COLOR, wip_limit: null });
  const statusSlugs = new Set();
  usStatuses.forEach(s => { s.slug = taigaSlug(s.name, statusSlugs); });
  const storyStatus = item => usStatusByList.get(item.listId)
    || usStatuses.find(s => s.name === item.listTitle)?.name || usStatuses[0].name;
  const closedStatus = new Set(usStatuses.filter(s => s.is_closed).map(s => s.name));

  const taskStatuses = TASK_STATUSES.map(row => [...row]);
  const issueStatuses = ISSUE_STATUSES.map(row => [...row]);
  const epicStatuses = EPIC_STATUSES.map(row => [...row]);
  const issueTypes = [...ISSUE_TYPES];
  const priorities = [...PRIORITIES];
  const severities = [...SEVERITIES];

  // Swimlanes: none when the board has only its Default one.
  const laneTitles = uniq(list(swimlanes).map(s => s.title))
    .filter(title => title !== TAIGA_EPICS_SWIMLANE && title !== TAIGA_ISSUES_SWIMLANE);
  const taigaLanes = laneTitles.length === 1 && laneTitles[0] === 'Default' ? [] : laneTitles;

  // Sprints: Taiga needs both dates of a milestone.
  const sprintNames = new Map();
  const usedSprintNames = new Set();
  const milestoneSlugs = new Set();
  const milestones = list(scrumSprints).filter(s => s && s.state !== 'cancelled' && s.plannedStart && s.plannedEnd)
    .map((sprint, index) => {
      const name = uniqueName(sprint.name, usedSprintNames);
      sprintNames.set(sprint._id, name);
      return { name, owner: null, created_date: nowText, modified_date: nowText,
        estimated_start: dayText(sprint.plannedStart), estimated_finish: dayText(sprint.plannedEnd),
        slug: taigaSlug(name, milestoneSlugs), closed: sprint.state === 'closed', disponibility: 0.0,
        order: index + 1, watchers: [] };
    });
  const sprintOf = item => (item.scrum && sprintNames.get(item.scrum.sprintId)) || null;

  // Points: "?" plus every story point value used.
  const points = [{ name: '?', order: 1, value: null }];
  const pointName = value => {
    if (num(value) === undefined || value < 0) return '?';
    const name = String(value);
    if (!points.some(p => p.name === name)) points.push({ name, order: points.length + 1, value });
    return name;
  };

  const attributeDefs = { epic: new Map(), story: new Map(), task: new Map(), issue: new Map() };
  const CONSUMED = {
    story: [TAIGA_FIELDS.points, TAIGA_FIELDS.blocked, TAIGA_FIELDS.client, TAIGA_FIELDS.team, TAIGA_FIELDS.dueReason],
    task: [TAIGA_FIELDS.taskStatus, TAIGA_FIELDS.blocked, TAIGA_FIELDS.dueReason, TAIGA_FIELDS.iocaine],
    issue: [TAIGA_FIELDS.blocked, TAIGA_FIELDS.dueReason],
    epic: [TAIGA_FIELDS.blocked, TAIGA_FIELDS.client, TAIGA_FIELDS.team],
  };
  const attributes = (item, kind) => {
    const out = {};
    for (const [name, raw] of Object.entries(isObject(item.customFields) ? item.customFields : {})) {
      if (CONSUMED[kind].includes(name)) continue;
      const value = attributeValue(raw);
      if (value === undefined || value === '') continue;
      out[name] = value;
      const type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text';
      const known = attributeDefs[kind].get(name);
      attributeDefs[kind].set(name, known && known !== type ? 'text' : type);
    }
    return out;
  };
  const fieldText = (item, name) => {
    const value = isObject(item.customFields) ? item.customFields[name] : undefined;
    return has(value) && typeof value !== 'object' ? String(value) : '';
  };
  const blocked = item => {
    const note = fieldText(item, TAIGA_FIELDS.blocked);
    return { blocked_note: note && note !== 'Blocked' && note !== 'true' ? note : '', is_blocked: Boolean(note) && note !== 'false' };
  };
  const flag = (item, name) => ['true', 'yes', '1'].includes(fieldText(item, name).toLowerCase());
  const peopleOf = item => uniq([item.owner, ...list(item.assignees)].map(person));
  const common = (item, kind) => {
    const assigned = peopleOf(item);
    return {
      owner: person(item.creator) || person(item.requestedBy) || null,
      assigned_to: assigned[0] || null,
      modified_date: taigaDateTimeText(item.createdAt) || nowText,
      created_date: taigaDateTimeText(item.createdAt) || nowText,
      ref: refs.get(item.cardId),
      subject: String(item.title || '').trim() || 'Untitled',
      description: kind === 'story' ? str(item.description)
        : [str(item.description), checklistMarkdown(item.checklists)].filter(Boolean).join('\n\n'),
      version: 1,
      ...blocked(item),
      attachments: [],
      history: history(item.comments, now),
      watchers: [],
      custom_attributes_values: attributes(item, kind),
    };
  };
  const plainTags = item => uniq(list(item.labels).map(name => String(name).trim()));

  const epicsOut = [];
  const storiesOut = [];
  const tasksOut = [];
  const issuesOut = [];
  const kanbanOrder = new Map();
  all.forEach(item => {
    const kind = kinds.get(item.cardId);
    if (kind === 'epic') {
      addStatus(epicStatuses, item.listTitle);
      epicsOut.push({
        ...common(item, 'epic'),
        status: item.listTitle || 'New',
        epics_order: epicsOut.length + 1,
        color: hexColor(item.color) || STATUS_COLOR,
        client_requirement: flag(item, TAIGA_FIELDS.client),
        team_requirement: flag(item, TAIGA_FIELDS.team),
        tags: plainTags(item),
        related_user_stories: all.filter(child => child.parentCardId === item.cardId && kinds.get(child.cardId) === 'story')
          .map((child, index) => ({ user_story: refs.get(child.cardId), order: index + 1, source_project_slug: null })),
      });
    } else if (kind === 'story') {
      const status = storyStatus(item);
      const order = (kanbanOrder.get(status) || 0) + 1;
      kanbanOrder.set(status, order);
      const lane = taigaLanes.includes(item.swimlaneTitle) ? item.swimlaneTitle : (taigaLanes[0] || null);
      const storyPoints = isObject(item.customFields) ? item.customFields[TAIGA_FIELDS.points] : undefined;
      const assigned = peopleOf(item);
      const { created_date: created, ...rest } = common(item, 'story');
      storiesOut.push({
        watchers: rest.watchers,
        role_points: [{ role: ROLE, points: pointName(typeof storyPoints === 'string' ? Number(storyPoints) : storyPoints) }],
        owner: rest.owner,
        assigned_to: rest.assigned_to,
        assigned_users: assigned,
        status,
        swimlane: lane,
        milestone: sprintOf(item),
        modified_date: rest.modified_date,
        created_date: created,
        finish_date: closedStatus.has(status) ? taigaDateTimeText(item.endAt) || nowText : null,
        generated_from_issue: null,
        generated_from_task: null,
        from_task_ref: null,
        ref: rest.ref,
        is_closed: closedStatus.has(status),
        backlog_order: (item.scrum && num(item.scrum.backlogRank)) ?? rest.ref,
        sprint_order: rest.ref,
        kanban_order: order,
        subject: rest.subject,
        description: rest.description,
        client_requirement: flag(item, TAIGA_FIELDS.client),
        team_requirement: flag(item, TAIGA_FIELDS.team),
        external_reference: null,
        tribe_gig: null,
        version: 1,
        blocked_note: rest.blocked_note,
        is_blocked: rest.is_blocked,
        tags: plainTags(item),
        due_date: taigaDateTimeText(item.dueAt),
        due_date_reason: fieldText(item, TAIGA_FIELDS.dueReason),
        attachments: [],
        history: rest.history,
        custom_attributes_values: rest.custom_attributes_values,
      });
    } else if (kind === 'issue') {
      const facet = name => {
        const label = list(item.labels).find(l => String(l).startsWith(`${name}:`));
        return label ? String(label).slice(name.length + 1).trim() : '';
      };
      const type = facet('type') || 'Bug';
      const priority = facet('priority') || 'Normal';
      const severity = facet('severity') || 'Normal';
      if (!issueTypes.includes(type)) issueTypes.push(type);
      if (!priorities.includes(priority)) priorities.push(priority);
      if (!severities.includes(severity)) severities.push(severity);
      const status = item.listTitle || 'New';
      addStatus(issueStatuses, status);
      issuesOut.push({
        ...common(item, 'issue'),
        status,
        priority,
        severity,
        type,
        milestone: sprintOf(item),
        votes: [],
        finished_date: issueStatuses.find(row => row[0] === status)[1] ? taigaDateTimeText(item.endAt) || nowText : null,
        external_reference: null,
        tags: plainTags(item).filter(name => !FACETS.some(f => name.startsWith(`${f}:`))),
        due_date: taigaDateTimeText(item.dueAt),
        due_date_reason: fieldText(item, TAIGA_FIELDS.dueReason),
      });
    }
  });

  // Tasks: subtask cards, then a story's checklist items.
  const storyMilestone = new Map(storiesOut.map(s => [s.ref, s.milestone]));
  const taskOrder = new Map();
  const nextTaskOrder = storyRef => { const n = (taskOrder.get(storyRef) || 0) + 1; taskOrder.set(storyRef, n); return n; };
  const pushTask = fields => {
    addStatus(taskStatuses, fields.status);
    const closed = taskStatuses.find(row => row[0] === fields.status)[1];
    tasksOut.push({ ...fields, finished_date: closed ? fields.finished_date || nowText : null });
  };
  all.filter(item => kinds.get(item.cardId) === 'task').forEach(item => {
    const story = storyOf(item);
    const storyRef = story ? refs.get(story.cardId) : null;
    const { assigned_to: assignedTo, ...rest } = common(item, 'task');
    const order = nextTaskOrder(storyRef);
    pushTask({
      owner: rest.owner,
      status: fieldText(item, TAIGA_FIELDS.taskStatus) || (item.endAt ? 'Closed' : 'New'),
      user_story: storyRef,
      milestone: storyRef ? storyMilestone.get(storyRef) || null : sprintOf(item),
      assigned_to: assignedTo,
      modified_date: rest.modified_date,
      created_date: rest.created_date,
      finished_date: taigaDateTimeText(item.endAt),
      ref: rest.ref,
      subject: rest.subject,
      us_order: order,
      taskboard_order: order,
      description: rest.description,
      is_iocaine: flag(item, TAIGA_FIELDS.iocaine),
      external_reference: null,
      version: 1,
      blocked_note: rest.blocked_note,
      is_blocked: rest.is_blocked,
      tags: plainTags(item),
      due_date: taigaDateTimeText(item.dueAt),
      due_date_reason: fieldText(item, TAIGA_FIELDS.dueReason),
      attachments: [],
      history: rest.history,
      watchers: [],
      custom_attributes_values: rest.custom_attributes_values,
    });
  });
  all.filter(item => kinds.get(item.cardId) === 'story').forEach(item => {
    const storyRef = refs.get(item.cardId);
    list(item.checklists).forEach(checklist => list(checklist.items).forEach(entry => {
      if (!str(entry.title).trim()) return;
      const ref = nextRef;
      nextRef += 1;
      const order = nextTaskOrder(storyRef);
      pushTask({
        owner: null, status: entry.done ? 'Closed' : 'New', user_story: storyRef,
        milestone: storyMilestone.get(storyRef) || null, assigned_to: null,
        modified_date: nowText, created_date: taigaDateTimeText(item.createdAt) || nowText, finished_date: null,
        ref, subject: entry.title.trim(), us_order: order, taskboard_order: order, description: '',
        is_iocaine: false, external_reference: null, version: 1, blocked_note: '', is_blocked: false,
        tags: [], due_date: null, due_date_reason: '', attachments: [], history: [], watchers: [],
        custom_attributes_values: {},
      });
    }));
  });

  // Tags with their colors: every board label but the issue facets.
  const tagsColors = list(board && board.labels).filter(l => l && str(l.name).trim()
    && !FACETS.some(f => l.name.startsWith(`${f}:`)))
    .map(l => [l.name.trim(), hexColor(l.color)]);

  const attributeRows = kind => [...attributeDefs[kind].entries()].map(([name, type], index) => ({
    name, description: '', type, order: index + 1, created_date: nowText, modified_date: nowText,
  }));
  const title = String((board && board.title) || '').trim() || 'WeKan board';
  const facetRows = names => names.map((name, index) => ({ name, order: index + 1, color: STATUS_COLOR }));
  const dueDates = () => [
    { name: 'Default', order: 1, by_default: true, color: '#9dce0a', days_to_due: null },
    { name: 'Due soon', order: 2, by_default: false, color: '#ff9900', days_to_due: 14 },
    { name: 'Past due', order: 3, by_default: false, color: '#ff8a84', days_to_due: 0 },
  ];

  // Every key ProjectExportSerializer writes, in its order.
  return {
    watchers: [],
    name: title,
    slug: taigaSlug(title),
    description: str(board && board.description).trim() || title,
    created_date: taigaDateTimeText(board && board.createdAt) || nowText,
    logo: null,
    total_milestones: milestones.length || null,
    total_story_points: null,
    is_epics_activated: epicsOut.length > 0,
    is_backlog_activated: milestones.length > 0,
    is_kanban_activated: true,
    is_wiki_activated: false,
    is_issues_activated: issuesOut.length > 0,
    videoconferences: null,
    videoconferences_extra_data: null,
    creation_template: null,
    is_private: true,
    is_featured: false,
    is_looking_for_people: false,
    looking_for_people_note: '',
    epics_csv_uuid: null,
    userstories_csv_uuid: null,
    tasks_csv_uuid: null,
    issues_csv_uuid: null,
    transfer_token: null,
    blocked_code: null,
    totals_updated_datetime: nowText,
    total_fans: 0,
    total_fans_last_week: 0,
    total_fans_last_month: 0,
    total_fans_last_year: 0,
    total_activity: 0,
    total_activity_last_week: 0,
    total_activity_last_month: 0,
    total_activity_last_year: 0,
    anon_permissions: [],
    public_permissions: [],
    modified_date: nowText,
    roles: [{ name: ROLE, slug: taigaSlug(ROLE), order: 10, computable: true, permissions: ROLE_PERMISSIONS }],
    // The importing user becomes the owner and an admin member (load_dump).
    owner: null,
    memberships: [],
    points,
    epic_statuses: statusRows(epicStatuses),
    us_statuses: usStatuses,
    us_duedates: dueDates(),
    task_statuses: statusRows(taskStatuses),
    task_duedates: dueDates(),
    issue_types: facetRows(issueTypes),
    issue_statuses: statusRows(issueStatuses),
    issue_duedates: dueDates(),
    priorities: facetRows(priorities),
    severities: facetRows(severities),
    swimlanes: taigaLanes.map((name, index) => ({ name, order: index + 1,
      statuses: usStatuses.map(s => ({ status: s.name, wip_limit: s.wip_limit })) })),
    tags_colors: tagsColors,
    default_points: '?',
    default_epic_status: 'New',
    default_us_status: usStatuses[0].name,
    default_task_status: 'New',
    default_priority: 'Normal',
    default_severity: 'Normal',
    default_issue_status: 'New',
    default_issue_type: 'Bug',
    default_swimlane: taigaLanes[0] || null,
    epiccustomattributes: attributeRows('epic'),
    userstorycustomattributes: attributeRows('story'),
    taskcustomattributes: attributeRows('task'),
    issuecustomattributes: attributeRows('issue'),
    epics: epicsOut,
    user_stories: storiesOut,
    tasks: tasksOut,
    milestones,
    issues: issuesOut,
    wiki_links: [],
    wiki_pages: [],
    tags: [],
    timeline: [],
  };
}

    return data=>formatTaiga(nativeSnapshot(data,'taiga'),new Date(data.now));
  })();


  const vikunjaExport=(()=>{
const VIKUNJA_EXPORT_VERSION = 'v1.0.0';
const VIKUNJA_MIN_VERSION = [0, 20, 1];
const MAX_VIKUNJA_DATA_CHARS = 64 * 1024 * 1024;
const MAX_VIKUNJA_TASKS = 20000;
const VIKUNJA_PRIORITIES = ['', 'Low', 'Medium', 'High', 'Urgent', 'DO NOW'];
const ZERO_TIME = '0001-01-01T00:00:00Z';
const POSITION_STEP = 65536;
const DEFAULT_TITLE = 'Checklist';

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const list = value => (Array.isArray(value) ? value : []);
const str = value => (typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '');
const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : Number.isFinite(Number(value)) && value !== '' && value !== null ? Number(value) : undefined);

function vikunjaDate(value) {
  if (typeof value !== 'string' || !value || value.startsWith('0001-01-01')) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const vikunjaTime = value => vikunjaDate(value) || ZERO_TIME;

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// WeKan text (and checklists) as the HTML Vikunja's editor stores: paragraphs,
// line breaks, and TipTap task lists - each under a heading with its title,
// except a single list with the default title.
function vikunjaHtml(text, checklists = []) {
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/)
    .map(part => part.trim()).filter(Boolean)
    .map(part => `<p>${part.split('\n').map(escapeHtml).join('<br>')}</p>`);
  const lists = list(checklists).filter(c => list(c && c.items).length);
  lists.forEach(checklist => {
    const title = String(checklist.title || '').trim();
    if (title && !(lists.length === 1 && title === DEFAULT_TITLE)) paragraphs.push(`<h3>${escapeHtml(title)}</h3>`);
    paragraphs.push(`<ul data-type="taskList">${checklist.items
      .map(entry => `<li data-checked="${entry.done ? 'true' : 'false'}" data-type="taskItem"><p>${escapeHtml(String(entry.title || '').trim())}</p></li>`)
      .join('')}</ul>`);
  });
  return paragraphs.join('');
}

function vikunjaPriority(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 5 ? value : 0;
  const text = String(value || '').trim().toLowerCase();
  if (/^[0-5]$/.test(text)) return +text;
  const index = VIKUNJA_PRIORITIES.findIndex(name => name && name.toLowerCase() === text);
  if (index > 0) return index;
  return { important: 3, 'do now': 5 }[text] || 0;
}

// The collected board (models/lib/externalExporters.js) as Vikunja projects:
// one project named after the board, or - with several swimlanes - that
// project as the parent of one child project per swimlane. Each has Vikunja's
// four views; the kanban view's buckets are the lists (a list called Done is
// its done bucket), and labels, people, dates, Priority, Percent Done and
// Done custom fields, comments and parent cards go to their Vikunja fields.
// Descriptions and comments stay text here, so the export boundary checks
// them as text; vikunjaArchiveFiles() turns them into Vikunja's HTML.
function formatVikunja({ board, lists, swimlanes, items }, now = new Date()) {
  const stamp = now.toISOString();
  const title = String((board && board.title) || 'WeKan board').trim() || 'WeKan board';
  const lanes = list(swimlanes).map(lane => String(lane.title || '').trim() || 'Default');
  const several = lanes.length > 1;
  const counters = { project: 0, view: 0, bucket: 0, comment: 0 };
  const id = kind => { counters[kind] += 1; return counters[kind]; };
  const users = new Map();
  const user = name => {
    const key = String(name || '').trim();
    if (!key) return null;
    if (!users.has(key)) users.set(key, { id: users.size + 1, name: '', username: key, created: stamp, updated: stamp });
    return users.get(key);
  };
  const labels = new Map();
  const label = name => {
    if (!labels.has(name)) labels.set(name, { id: labels.size + 1, title: name, description: '', hex_color: '', created: stamp, updated: stamp });
    return labels.get(name);
  };
  const listTitles = list(lists).map(entry => String(entry.title || '').trim() || 'Untitled');
  list(items).forEach(item => {
    const name = String(item.listTitle || '').trim() || 'Untitled';
    if (!listTitles.includes(name)) listTitles.push(name);
  });
  const wip = new Map(list(lists).map(entry => [String(entry.title || '').trim() || 'Untitled',
    entry.wipLimit && entry.wipLimit.enabled && Number(entry.wipLimit.value) > 0 ? Number(entry.wipLimit.value) : 0]));

  const projects = [];
  const parentId = several ? id('project') : 0;
  if (several) {
    projects.push({ id: parentId, title, description: '', identifier: '', hex_color: '', parent_project_id: 0,
      is_archived: false, background_information: null, position: POSITION_STEP, views: [], child_projects: null,
      tasks: [], buckets: [], task_buckets: [], positions: [], background_file_id: 0, created: stamp, updated: stamp });
  }
  const laneProjects = (several ? lanes : [title]).map((laneTitle, index) => {
    const projectId = id('project');
    const views = ['list', 'gantt', 'table', 'kanban'].map((kind, viewIndex) => ({
      id: id('view'),
      title: kind[0].toUpperCase() + kind.slice(1),
      project_id: projectId,
      view_kind: kind,
      filter: null,
      position: (viewIndex + 1) * 100,
      bucket_configuration_mode: kind === 'kanban' ? 'manual' : 'none',
      bucket_configuration: null,
      default_bucket_id: 0,
      done_bucket_id: 0,
      created: stamp,
      updated: stamp,
    }));
    const buckets = listTitles.map((bucketTitle, bucketIndex) => ({
      id: id('bucket'),
      title: bucketTitle,
      project_view_id: views[3].id,
      limit: wip.get(bucketTitle) || 0,
      position: (bucketIndex + 1) * POSITION_STEP,
      created: stamp,
      updated: stamp,
    }));
    const kanban = views[3];
    kanban.default_bucket_id = buckets.length ? buckets[0].id : 0;
    const done = buckets.find(bucket => /^done$/i.test(bucket.title));
    kanban.done_bucket_id = done ? done.id : 0;
    return { id: projectId, title: laneTitle, description: '', identifier: '', hex_color: '',
      parent_project_id: parentId, is_archived: false, background_information: null,
      position: (index + 1) * POSITION_STEP, views, child_projects: null, tasks: [], buckets,
      task_buckets: [], positions: [], background_file_id: 0, created: stamp, updated: stamp,
      kanbanId: kanban.id, doneBucketId: kanban.done_bucket_id };
  });

  const taskIdOf = new Map();
  const checklists = {};
  let taskId = 0;
  list(items).forEach(item => {
    taskId += 1;
    if (item.cardId && !taskIdOf.has(item.cardId)) taskIdOf.set(item.cardId, { taskId, task: null });
  });
  taskId = 0;
  list(items).forEach(item => {
    taskId += 1;
    const lane = several ? Math.max(0, lanes.indexOf(String(item.swimlaneTitle || '').trim() || 'Default')) : 0;
    const project = laneProjects[lane];

    const bucket = project.buckets.find(entry => entry.title === (String(item.listTitle || '').trim() || 'Untitled')) || project.buckets[0];
    const fields = item.customFields || {};
    const isDone = fields.Done === true || Boolean(bucket && bucket.id === project.doneBucketId);
    const percent = Number(fields['Percent Done']);
    const people = [item.owner, ...list(item.assignees)].map(user).filter(Boolean);
    const position = (project.tasks.length + 1) * POSITION_STEP;
    const task = {
      id: taskId,
      title: String(item.title || '').trim() || 'Untitled',
      description: item.description || '',
      done: isDone,
      done_at: isDone ? vikunjaTime(item.endAt || stamp) : ZERO_TIME,
      due_date: vikunjaTime(item.dueAt),
      start_date: vikunjaTime(item.startAt),
      end_date: vikunjaTime(item.endAt),
      reminders: [],
      repeat_after: 0,
      repeat_mode: 0,
      priority: vikunjaPriority(fields.Priority),
      assignees: [...new Set(people)],
      labels: [...new Set(list(item.labels).map(name => String(name).trim()).filter(Boolean))].map(label),
      hex_color: '',
      percent_done: Number.isFinite(percent) && percent > 0 ? Math.min(percent, 100) / 100 : 0,
      identifier: '',
      index: project.tasks.length + 1,
      project_id: project.id,
      related_tasks: {},
      attachments: [],
      cover_image_attachment_id: 0,
      is_favorite: false,
      bucket_id: bucket ? bucket.id : 0,
      position,
      created: vikunjaTime(item.createdAt || stamp),
      updated: stamp,
      ...(user(item.creator || item.requestedBy) ? { created_by: user(item.creator || item.requestedBy) } : {}),
      comments: list(item.comments).filter(comment => String(comment.text || '').trim()).map(comment => ({
        id: id('comment'),
        comment: String(comment.text || ''),
        ...(user(comment.author) ? { author: user(comment.author) } : {}),
        created: vikunjaTime(comment.date || stamp),
        updated: vikunjaTime(comment.date || stamp),
      })),
    };
    if (list(item.checklists).some(entry => list(entry.items).length)) {
      checklists[taskId] = list(item.checklists).map(entry => ({ title: String(entry.title || ''),
        items: list(entry.items).map(it => ({ title: String(it.title || ''), done: Boolean(it.done) })) }));
    }
    project.tasks.push(task);
    if (item.cardId && taskIdOf.get(item.cardId).taskId === taskId) taskIdOf.get(item.cardId).task = task;
    if (bucket) project.task_buckets.push({ bucket_id: bucket.id, task_id: taskId, project_view_id: project.kanbanId });
    project.positions.push({ task_id: taskId, project_view_id: project.kanbanId, position });
  });
  // Parent cards as Vikunja's subtask/parenttask pair, by id only: an id
  // that is not in the same project is dropped by Vikunja's import, never
  // duplicated as a new task.
  list(items).forEach(item => {
    const child = item.cardId && taskIdOf.get(item.cardId);
    const parent = item.parentCardId && taskIdOf.get(item.parentCardId);
    if (!child || !parent || !child.task || !parent.task || child.taskId === parent.taskId) return;
    const childTask = child.task;
    const parentTask = parent.task;
    childTask.related_tasks.parenttask = [{ id: parent.taskId }];
    (parentTask.related_tasks.subtask = parentTask.related_tasks.subtask || []).push({ id: child.taskId });
  });
  laneProjects.forEach(project => {
    delete project.kanbanId;
    delete project.doneBucketId;
    projects.push(project);
  });
  return { version: VIKUNJA_EXPORT_VERSION, projects, checklists };
}

// The files of the export zip for formatVikunja()'s result, descriptions and
// comments as Vikunja's HTML; server/lib/vikunjaArchive.js zips them.
function vikunjaArchiveFiles({ version, projects, checklists } = {}) {
  const lists = isObject(checklists) ? checklists : {};
  const data = list(projects).map(project => ({
    ...project,
    tasks: list(project.tasks).map(task => ({
      ...task,
      description: vikunjaHtml(task.description, lists[task.id]),
      comments: list(task.comments).map(comment => ({ ...comment, comment: vikunjaHtml(comment.comment) })),
    })),
  }));
  return {
    'data.json': JSON.stringify(data),
    'filters.json': '[]',
    // Vikunja parses this file as it is: no trailing newline.
    VERSION: String(version || VIKUNJA_EXPORT_VERSION).trim(),
  };
}

    const data=snapshot=>formatVikunja(nativeSnapshot(snapshot,'vikunja'),new Date(snapshot.now));
    return {data,files:snapshot=>vikunjaArchiveFiles(data(snapshot))};
  })();
  const vikunjaData=vikunjaExport.data,vikunjaFiles=vikunjaExport.files;
  const vikunjaArchive=data=>stored(Object.entries(vikunjaFiles(data)).map(([name,content])=>({name,content})));


  const wrikeWorkflow=(()=>{
const WRIKE_STATUS_GROUPS = ['Active', 'Completed', 'Deferred', 'Cancelled'];
const WRIKE_STATUS_COLORS = ['Brown', 'DarkCyan', 'Gray', 'Blue', 'DarkBlue', 'Orange', 'Red', 'YellowGreen',
  'Purple', 'Yellow', 'Indigo', 'DarkRed', 'Turquoise', 'Green'];
const MAX_WRIKE_NAME = 128;

const GROUP_COLOR = { Active: 'Blue', Completed: 'Green', Deferred: 'Gray', Cancelled: 'Red' };
const WRIKE_TO_WEKAN = {
  Brown: 'saddlebrown', DarkCyan: 'sky', Gray: 'gray', Blue: 'blue', DarkBlue: 'navy', Orange: 'orange', Red: 'red',
  YellowGreen: 'lime', Purple: 'purple', Yellow: 'yellow', Indigo: 'indigo', DarkRed: 'crimson', Turquoise: 'paleturquoise',
  Green: 'green',
};
const WEKAN_TO_WRIKE = {
  ...Object.fromEntries(Object.entries(WRIKE_TO_WEKAN).map(([wrike, wekan]) => [wekan, wrike])),
  white: 'Gray', black: 'Gray', silver: 'Gray', peachpuff: 'Orange', pink: 'Red', mistyrose: 'Red', plum: 'Purple',
  magenta: 'Purple', darkgreen: 'Green', slateblue: 'Indigo', gold: 'Yellow',
};

const NAMED_GROUPS = [
  ['Completed', /^(completed?|done|closed|finished|resolved|shipped|released|delivered|approved|accepted)$/i],
  ['Cancelled', /^(cancell?ed|canceled|rejected|won'?t (do|fix)|wontfix|abandoned|dropped|declined|obsolete|invalid|duplicate)$/i],
  ['Deferred', /^(deferred|on hold|paused|someday|later|parked|icebox|postponed|waiting)$/i],
];

// The group a list's name alone suggests.
function wrikeGroupForName(name) {
  const text = String(name || '').trim();
  const own = WRIKE_STATUS_GROUPS.find(group => group.toLowerCase() === text.toLowerCase());
  if (own) return own;
  const named = NAMED_GROUPS.find(([, pattern]) => pattern.test(text));
  return named ? named[0] : 'Active';
}

const wrikeName = name => String(name || '').trim().slice(0, MAX_WRIKE_NAME);

// A WeKan list color (a named palette color or '#rrggbb') as a Wrike color.
function wrikeColorForList(color, group) {
  const named = WEKAN_TO_WRIKE[String(color || '').toLowerCase()];
  return named || GROUP_COLOR[group] || 'Gray';
}

const wekanColorForWrike = color => WRIKE_TO_WEKAN[color] || '';

// The list a moveCard rule names, when it names exactly one.
const movedTo = trigger => (trigger && trigger.activityType === 'moveCard' && trigger.listName && trigger.listName !== '*'
  ? String(trigger.listName) : '');

// rules: [{ trigger, action }] in the portable shape of the Rules export.
// Returns Map(list title -> 'complete' | 'incomplete') for the lists whose
// move rule marks a card complete or incomplete; when rules disagree about a
// list, the last one wins, as it is the one that runs last.
function completionByList(rules) {
  const byList = new Map();
  for (const rule of Array.isArray(rules) ? rules : []) {
    const list = movedTo(rule && rule.trigger);
    const type = rule && rule.action && rule.action.actionType;
    if (!list) continue;
    if (type === 'markCardComplete') byList.set(list, 'complete');
    else if (type === 'markCardIncomplete') byList.set(list, 'incomplete');
  }
  return byList;
}

// The group of a list: its rule first, then its name.
function wrikeGroupForList(title, completion) {
  const byName = wrikeGroupForName(title);
  const rule = completion && completion.get(String(title || ''));
  if (rule === 'complete') return byName === 'Cancelled' ? 'Cancelled' : 'Completed';
  if (rule === 'incomplete') return byName === 'Deferred' ? 'Deferred' : 'Active';
  return byName;
}

// A board's lists and rules as a Wrike workflow, in the shape GET /workflows
// returns. Wrike requires a workflow to have an Active and a Completed status;
// when no list is one, a status of that group is added, named after it.
// Returns { workflow, statusOf } where statusOf(list title) is the
// { name, group } the Excel export writes for a card in that list.
function wrikeWorkflowFromBoard({ boardTitle, lists, rules }) {
  const completion = completionByList(rules);
  const statuses = [];
  const byTitle = new Map();
  for (const list of Array.isArray(lists) ? lists : []) {
    const title = String((list && list.title) || '').trim();
    if (!title || byTitle.has(title)) continue;
    let name = wrikeName(title);
    // Two lists whose names only differ after 128 symbols stay two statuses.
    for (let n = 2; statuses.some(status => status.name === name); n += 1) name = `${wrikeName(title).slice(0, MAX_WRIKE_NAME - 4)} (${n})`;
    const group = wrikeGroupForList(title, completion);
    const status = { name, standardName: false, color: wrikeColorForList(list.color, group), standard: false, group, hidden: false };
    statuses.push(status);
    byTitle.set(title, status);
  }
  for (const group of ['Active', 'Completed']) {
    if (statuses.some(status => status.group === group)) continue;
    let name = group;
    for (let n = 2; statuses.some(status => status.name === name); n += 1) name = `${group} (${n})`;
    const added = { name, standardName: false, color: GROUP_COLOR[group], standard: false, group, hidden: false };
    if (group === 'Active') statuses.unshift(added); else statuses.push(added);
  }
  const workflow = {
    kind: 'workflows',
    data: [{ name: wrikeName(boardTitle) || 'WeKan board', standard: false, hidden: false, customStatuses: statuses }],
  };
  const statusOf = title => {
    const status = byTitle.get(String(title || '').trim());
    if (status) return { name: status.name, group: status.group };
    const first = statuses.find(candidate => candidate.group === 'Active');
    return { name: first.name, group: first.group };
  };
  return { workflow, statusOf };
}


    const data=descriptor=>{
      const data=descriptor;
      const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
      if(!exact(data,'board,format,lists')||data.format!=='wrikeworkflow'||!exact(data.board,'title')||typeof data.board.title!=='string'||!Array.isArray(data.lists)||!data.lists.every(item=>exact(item,'color,title')&&typeof item.title==='string'&&typeof item.color==='string'))throw new Error('Invalid board export');
      return wrikeWorkflowFromBoard({boardTitle:data.board.title,lists:data.lists}).workflow;
    };
    return {data,fromBoard:wrikeWorkflowFromBoard};
  })();
  const wrikeWorkflowData=wrikeWorkflow.data;


  const wrikeData=(()=>{
    const wrikeWorkflowFromBoard=wrikeWorkflow.fromBoard;
const WRIKE_COLUMNS = ['Key', 'Parent Task', 'Title', 'Status', 'Priority', 'Assigned To', 'Start Date',
  'Duration', 'End Date', 'Depends On', 'Start Date Constraint', 'Description'];
// The workflow columns Wrike's import needs for a custom status, in the order
// the help article lists them: Workflow left of Status, Custom Status right.
const WRIKE_WORKFLOW_COLUMNS = ['Default task workflow', 'Default project workflow', 'Workflow', 'Status', 'Custom Status'];
// What WeKan's export writes: the documented columns with the workflow ones in
// place of Status.
const WRIKE_EXPORT_COLUMNS = ['Key', 'Parent Task', 'Title', ...WRIKE_WORKFLOW_COLUMNS,
  ...WRIKE_COLUMNS.slice(WRIKE_COLUMNS.indexOf('Status') + 1)];
const WRIKE_DATE_COLUMNS = ['Start Date', 'End Date', 'Start Date Constraint'];
const WRIKE_STATUSES = ['Active', 'Completed', 'Deferred', 'Cancelled'];
const WRIKE_PRIORITIES = ['High', 'Normal', 'Low'];
// Wrike's own export stops at 65,000 rows.
const MAX_WRIKE_ROWS = 65000;
const MAX_KEY = 999999;

const ROLES = {
  key: 'key',
  'parent task': 'parent',
  title: 'title',
  status: 'status',
  'custom status': 'customStatus',
  priority: 'priority',
  'assigned to': 'people',
  'start date': 'start',
  duration: 'duration',
  'end date': 'end',
  'depends on': 'depends',
  'start date constraint': 'constraint',
  description: 'description',
  'default task workflow': 'defaultWorkflow',
  'default project workflow': 'defaultWorkflow',
  workflow: 'workflow',
};
const roleOf = title => ROLES[String(title || '').trim().toLowerCase()];

const day = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
const PRIORITY_ALIASES = { urgent: 'High', highest: 'High', high: 'High', medium: 'Normal', normal: 'Normal', low: 'Low', lowest: 'Low' };

// The import template on a "Tasks" sheet, as Wrike's Excel import reads it:
// a folder row "/<swimlane>/" above the cards of each swimlane but Default,
// sequential Keys, Parent Task by Key, dates as YYYY-MM-DD (written as date
// cells by server/lib/wrikeWorkbook.js), and the custom fields to the right of
// Description. A card's list is its custom status in the workflow named after
// the board - the one the "Wrike workflow" export describes, which has to
// exist in Wrike for its import to use it - and each folder row makes that
// workflow its tasks' default.
function formatWrikeRows({ board, items, lists, workflowRules }) {
  const list = Array.isArray(items) ? items : [];
  const boardLists = Array.isArray(lists) && lists.length ? lists
    : [...new Set(list.map(item => item.listTitle).filter(Boolean))].map(title => ({ title }));
  const { workflow, statusOf } = wrikeWorkflowFromBoard({ boardTitle: board && board.title, lists: boardLists, rules: workflowRules });
  const workflowName = workflow.data[0].name;
  const extra = [];
  for (const item of list) {
    for (const name of Object.keys(item.customFields || {})) {
      if (!extra.includes(name) && !roleOf(name) && !['priority', 'duration'].includes(name.toLowerCase())) extra.push(name);
    }
  }
  const header = [...WRIKE_EXPORT_COLUMNS, ...extra];
  const rows = [header];
  const lanes = [];
  for (const item of list) {
    const lane = item.swimlaneTitle && item.swimlaneTitle !== 'Default' ? item.swimlaneTitle : 'Default';
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  // Default first: its cards need no folder row.
  lanes.sort((a, b) => (a === 'Default' ? -1 : b === 'Default' ? 1 : 0));
  const keyOf = new Map();
  let next = 1;
  const order = [];
  for (const lane of lanes) {
    if (lane !== 'Default') order.push({ folder: lane, key: next++ });
    for (const item of list) {
      const itemLane = item.swimlaneTitle && item.swimlaneTitle !== 'Default' ? item.swimlaneTitle : 'Default';
      if (itemLane !== lane) continue;
      keyOf.set(item.cardId, next);
      order.push({ item, key: next++ });
    }
  }
  for (const { folder, item, key } of order) {
    if (folder) {
      const path = folder.split('/').map(part => part.trim()).filter(Boolean).join('/');
      rows.push(header.map(name => (name === 'Key' ? key : name === 'Title' ? `/${path || 'Folder'}/` : name === 'Default task workflow' ? workflowName : '')));
      continue;
    }
    const fields = item.customFields || {};
    const fieldOf = wanted => Object.keys(fields).find(name => name.toLowerCase() === wanted);
    const priority = fieldOf('priority') ? PRIORITY_ALIASES[String(fields[fieldOf('priority')]).trim().toLowerCase()] || '' : '';
    const values = {
      Key: key,
      'Parent Task': item.parentCardId && keyOf.has(item.parentCardId) ? keyOf.get(item.parentCardId) : '',
      Title: String(item.title || '').trim() || 'Untitled',
      Workflow: workflowName,
      Status: statusOf(item.listTitle).group,
      'Custom Status': statusOf(item.listTitle).name,
      Priority: priority,
      'Assigned To': [item.owner, ...(Array.isArray(item.assignees) ? item.assignees : [])].filter(Boolean).join(', '),
      'Start Date': day(item.startAt),
      Duration: fieldOf('duration') ? String(fields[fieldOf('duration')]) : '',
      'End Date': day(item.dueAt),
      'Depends On': '',
      'Start Date Constraint': '',
      Description: item.description || '',
    };
    rows.push(header.map(name => (name in values ? values[name] : fields[name] === undefined ? '' : fields[name])));
  }
  return { sheet: 'Tasks', rows };
}

    return data=>{
      const result=formatWrikeRows(nativeSnapshot(data,'wrike'));
      if(result.rows.length>65000||result.rows[0].length>16384||!result.rows.every(row=>row.length===result.rows[0].length&&row.every(value=>['string','number','boolean'].includes(typeof value)&&!(typeof value==='number'&&!Number.isFinite(value)))))throw new Error('Invalid board export');
      return result;
    };
  })();
  function wrikeWorkbook(data){
    const result=wrikeData(data),dateColumns=result.rows[0].map((title,index)=>['start date','end date','start date constraint'].includes(title.trim().toLowerCase())?index:-1).filter(index=>index>=0);
    const rows=result.rows.map((row,rowIndex)=>row.map((value,index)=>{const match=rowIndex>0&&dateColumns.includes(index)&&/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));return match?new Date(Date.UTC(+match[1],+match[2]-1,+match[3])):value;}));
    return typedWorkbook({name:result.sheet,rows,dateColumns});
  }


  const teamworkData=(()=>{
const TEAMWORK_COLUMNS = ['Tasklist', 'Task', 'Description', 'Assign to', 'Start date', 'Due date',
  'Priority', 'Estimated time', 'Tags', 'Status'];
const TEAMWORK_PRIORITY = ['low', 'medium', 'high'];
const TEAMWORK_STATUS = ['Active', 'Complete'];
const ESTIMATE_FIELD = 'Estimated time (hours)';
const MAX_TEAMWORK_ROWS = 20000;
const DEFAULT_LIST = 'Tasks';
function teamworkEstimateText(minutes) {
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) return '';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const day = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '' : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

// The template's rows for a collected board (models/lib/externalExporters.js);
// server/lib/teamworkWorkbook.js writes them. Dates are date cells, which
// Excel shows in the reader's own format. A subtask follows its parent with
// one "-" per level, when both are in the same list (a Teamwork subtask is in
// its parent's task list); a title's own leading -, # or > would read as a
// subtask prefix, and the template has no escape for it, so it is dropped.
// The template has ten fixed columns: swimlanes, other custom fields,
// checklists, comments and attachments have no place in it.
function formatTeamworkSheet({ board, items }) {
  const all = Array.isArray(items) ? items : [];
  const byId = new Map(all.map(item => [item.cardId, item]));
  const parentOf = item => {
    const parent = item.parentCardId && byId.get(item.parentCardId);
    return parent && parent !== item && parent.listTitle === item.listTitle ? parent : null;
  };
  const children = new Map();
  const roots = [];
  for (const item of all) {
    const parent = parentOf(item);
    if (parent) {
      if (!children.has(parent.cardId)) children.set(parent.cardId, []);
      children.get(parent.cardId).push(item);
    } else roots.push(item);
  }
  const rows = [TEAMWORK_COLUMNS];
  const seen = new Set();
  const write = (item, depth) => {
    if (seen.has(item)) return;
    seen.add(item);
    const fields = item.customFields || {};
    const people = [item.owner, ...(Array.isArray(item.assignees) ? item.assignees : [])].filter(Boolean);
    const priority = String(fields.Priority || '').toLowerCase();
    const complete = fields.Complete === true || item.dueComplete === true || Boolean(item.endAt);
    const title = String(item.title || '').replace(/^[-#>\s]+/, '').trim() || 'Untitled';
    const values = {
      Tasklist: item.listTitle || DEFAULT_LIST,
      Task: `${'-'.repeat(depth)}${title}`,
      Description: item.description || '',
      'Assign to': people.join(', '),
      'Start date': day(item.startAt),
      'Due date': day(item.dueAt),
      Priority: TEAMWORK_PRIORITY.includes(priority) ? priority : '',
      'Estimated time': teamworkEstimateText(Number(fields[ESTIMATE_FIELD]) * 60),
      Tags: (Array.isArray(item.labels) ? item.labels : []).map(tag => String(tag).replace(/,/g, ' ').trim()).filter(Boolean).join(', '),
      Status: complete ? 'Complete' : 'Active',
    };
    rows.push(TEAMWORK_COLUMNS.map(name => values[name]));
    for (const child of children.get(item.cardId) || []) write(child, depth + 1);
  };
  roots.forEach(item => write(item, 0));
  // A parent loop leaves cards no root reaches: they are written as tasks.
  all.forEach(item => write(item, 0));
  return { name: String((board && board.title) || 'Tasks'), rows };
}

    return data=>{
      const result=formatTeamworkSheet(nativeSnapshot(data,'teamwork'));
      if(result.rows.length>20000)throw new Error('Invalid board export');
      return result;
    };
  })();
  function teamworkWorkbook(data){
    const result=teamworkData(data),name=String(result.name||'Tasks').replace(/[\\/?*\[\]:]/g,' ').trim().slice(0,31)||'Tasks';
    if(name==='History'||name.startsWith("'")||name.endsWith("'"))throw new Error('Invalid board export');
    return typedWorkbook({name,rows:result.rows,dateColumns:[4,5]});
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
    if(!/^wekan-boards-(weba|csv|scsv|tsv|kanboard|markdown|leo|opml|orgmode|todotxt|taskwarrior|focalboard|todoist|planner|meistertask|obsidian|linear|ticktick|clickup|nullboard|kanri|pivotal|redmine|tasksorg|monday|businessmap|superproductivity|taiga|vikunja|wrikeworkflow|wrike|teamwork|quire)\.zip$/.test(filename))throw new Error('Invalid board export');
    const url=URL.createObjectURL(new Blob([archive(payload(encoded))],{type:'application/zip'})),link=document.createElement('a');
    link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadWorkbook(encoded){
    const url=URL.createObjectURL(new Blob([workbook(payload(encoded))],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');
    link.href=url;link.download='wekan-boards.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.webaBatchExport={archive,workbook,plannerWorkbook,mondayWorkbook,mondayData,businessmapWorkbook,businessmapData,taigaData,vikunjaData,vikunjaFiles,vikunjaArchive,wrikeWorkflowData,wrikeData,wrikeWorkbook,teamworkData,teamworkWorkbook,uniqueSheetNames,downloadPayload,downloadWorkbook};
})();
