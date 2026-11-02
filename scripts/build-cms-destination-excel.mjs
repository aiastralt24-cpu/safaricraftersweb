import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
// Run a copy in a bundled-runtime directory with schema.json and node_modules.
const root=process.argv[2];
if(!root)throw new Error('Pass the absolute repository path.');
const schema=JSON.parse(await fs.readFile(new URL('./schema.json',import.meta.url),'utf8'));
const wb=Workbook.create(),green='#234638',ink='#25352E';
const guide=wb.worksheets.add('Instructions');guide.showGridLines=false;
const notes=[
 ['Start here','Fill Pages first. Repeat its recordId on every related row. Amber cells are editable.'],
 ['Draft workflow','This template prepares drafts. Upload and saving will be available after CMS integration.'],
 ['Create','Use a unique temporary recordId, operation create, a new slug, title and locale en.'],
 ['Update','Use the CMS record UUID and exact current revision. Keep slug and locale unchanged.'],
 ['Preserve content','Omit Content rows to preserve fields. An included row with an empty value clears that field.'],
 ['Replace collections','For updates, list collection names in Pages.replaceCollections, separated by commas. Supply ALL replacement rows.'],
 ['Clear collections','A listed collection with no replacement rows is cleared. Unlisted collections remain unchanged.'],
 ['Collection names','bestFor, highlights, image, heroImage, gallery, seo.socialImage, journeys, expeditions, pairings, faqs, sources, editorial.scoop'],
 ['Ordering','Use unique itemId and positive position within each collection. Item IDs do not merge existing items.'],
 ['Images and links','Use uploaded CMS image IDs and related CMS record UUIDs. Do not embed images or external workbook links.'],
 ['Text and dates','Use plain text, including dates as YYYY-MM-DD. Only position accepts numbers. Keep headings unchanged.'],
 ['Limits','Maximum 500 data rows total and 5 MB. Red cells exceed column limits. Field-specific limits and word guidance are checked on import.'],
 ['Reference','The field lists below come from destination-import-contract.ts. No sample content is included in the import sheets.'],
];
const rows=[['templateVersion',schema.version,'',''],['pageType','destination','',''],['','','',''],['Destination import','Safari Crafters','',''],['','','',''],...notes.map(([a,b])=>[a,b,'','']),['','','',''],['Table / field','Meaning','Hard character limit','Guidance']];
for(const [name,fields]of Object.entries(schema.sheets))for(const field of fields)rows.push([`${name}.${field.key}`,`${field.label}${field.required?' (required)':''}`,String(field.max??''),field.guidance?`Recommended ${field.guidance.max} ${field.guidance.unit}`:'']);
rows.push(['Content field paths','Use these exact paths in Content.field','Hard character limit','Guidance']);
for(const [name,rule]of Object.entries(schema.contentFields))rows.push([name,'',String(rule.max),rule.guidance?`Recommended ${rule.guidance.max} ${rule.guidance.unit}`:'']);
guide.getRange(`A1:D${rows.length}`).values=rows;
guide.getRange(`A1:D${rows.length}`).format={font:{name:'Arial',size:11,color:ink},rowHeight:40,wrapText:true,verticalAlignment:'center'};
for(const [col,width]of [['A',36],['B',84],['C',24],['D',30]])guide.getRange(`${col}1:${col}${rows.length}`).format.columnWidth=width;
guide.getRange('A1:B2').setNumberFormat('@');guide.getRange('A4:B4').format.font={name:'Arial',size:16,bold:true,color:green};
guide.getRange(`A6:D${5+notes.length}`).format.rowHeight=56;
const header=row=>guide.getRange(`A${row}:D${row}`).format={fill:green,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'}};
header(7+notes.length);header(rows.findIndex(row=>row[0]==='Content field paths')+1);
const choices={operation:['create','update'],role:['image','heroImage','gallery','seo.socialImage'],type:['journey','photoExpedition','destination'],decorative:['true','false']};
for(const [name,fields]of Object.entries(schema.sheets)){
 const sheet=wb.worksheets.add(name),last=String.fromCharCode(64+fields.length);sheet.showGridLines=false;
 sheet.getRange(`A1:${last}101`).format={font:{name:'Arial',size:11,color:ink},columnWidth:28,rowHeight:38,wrapText:true,verticalAlignment:'center'};
 sheet.getRange(`A1:${last}101`).setNumberFormat('@');sheet.getRange(`A1:${last}1`).values=[fields.map(f=>f.key)];
 sheet.getRange(`A1:${last}1`).format={fill:green,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:38};
 sheet.getRange(`A2:${last}101`).format.fill='#FFF6DC';sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(1);
 fields.forEach((field,i)=>{const col=String.fromCharCode(65+i),range=sheet.getRange(`${col}2:${col}101`);
  if(['value','text','answer','reason','body','replaceCollections'].includes(field.key))sheet.getRange(`${col}1:${col}101`).format.columnWidth=55;
  if(field.key==='position'){range.setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:1,formula2:999999}});}
  if(choices[field.key])range.dataValidation={rule:{type:'list',values:choices[field.key]}};
  if(name==='Lists'&&field.key==='field')range.dataValidation={rule:{type:'list',values:['bestFor','highlights']}};
  if(field.max)range.conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${field.max}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
wb.recalculate();
await fs.mkdir(new URL('./previews',import.meta.url),{recursive:true});
for(const name of ['Instructions',...Object.keys(schema.sheets)]){
 const range=name==='Instructions'?'A1:B18':`A1:${String.fromCharCode(64+schema.sheets[name].length)}5`;
 const blob=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(new URL(`./previews/${name}.png`,import.meta.url),new Uint8Array(await blob.arrayBuffer()));
}
console.log((await wb.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10}})).ndjson);
await(await SpreadsheetFile.exportXlsx(wb)).save(`${root}/public/cms/templates/destination-v1.xlsx`);
// Test fixture only; never distributed as the blank client template.
wb.worksheets.getItem('Pages').getRange('A2:G2').values=[['destination-example','create','','forest-example','Forest example','en','']];
wb.worksheets.getItem('Content').getRange('A2:C2').values=[['destination-example','intro','Example introduction for parser verification only.']];
wb.recalculate();await(await SpreadsheetFile.exportXlsx(wb)).save(`${root}/tests/fixtures/destination-v1-filled.xlsx`);
