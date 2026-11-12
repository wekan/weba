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
      if(!entry||typeof entry.name!=='string'||!/^board-[1-9][0-9]*\.(json|jsonl|csv|tsv|md|leo|opml|org|txt|xlsx|nbx)$/.test(entry.name))throw new Error('Invalid board export');
      if(entry.name.endsWith('.xlsx')){
        if(typeof entry.content!=='string')throw new Error('Invalid board export');
        let descriptor;try{descriptor=JSON.parse(entry.content);}catch{throw new Error('Invalid board export');}
        normalized.push({name:entry.name,bytes:descriptor&&descriptor.format==='businessmap'?businessmapWorkbook(descriptor):descriptor&&descriptor.format==='monday'?mondayWorkbook(descriptor):plannerWorkbook(descriptor)});continue;
      }
      const content=entry.content==null&&entry.name.endsWith('.txt')?'':entry.content;
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
  function typedWorkbook({name,rows}){
    const mondayXml=value=>xml(String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,''));
    const shared=[],indices=new Map();let stringCount=0;
    const stringIndex=value=>{stringCount++;if(!indices.has(value)){indices.set(value,shared.length);shared.push(value);}return indices.get(value);};
    const mondayRows=rows.map((values,index)=>`<row r="${index+1}">${values.map((value,cellIndex)=>{
      const attrs=`r="${column(cellIndex)}${index+1}"${index===0?' s="1"':''}`;
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
    if(!/^wekan-boards-(weba|csv|scsv|tsv|kanboard|markdown|leo|opml|orgmode|todotxt|taskwarrior|focalboard|todoist|planner|meistertask|obsidian|linear|ticktick|clickup|nullboard|kanri|pivotal|redmine|tasksorg|monday|businessmap)\.zip$/.test(filename))throw new Error('Invalid board export');
    const url=URL.createObjectURL(new Blob([archive(payload(encoded))],{type:'application/zip'})),link=document.createElement('a');
    link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadWorkbook(encoded){
    const url=URL.createObjectURL(new Blob([workbook(payload(encoded))],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');
    link.href=url;link.download='wekan-boards.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.webaBatchExport={archive,workbook,plannerWorkbook,mondayWorkbook,mondayData,businessmapWorkbook,businessmapData,uniqueSheetNames,downloadPayload,downloadWorkbook};
})();
