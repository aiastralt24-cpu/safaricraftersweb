import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=process.argv[2];
if(!root)throw new Error('Pass the absolute repository path. Run from a bundled-runtime build directory containing schema.json.');
const schema=JSON.parse(await fs.readFile(new URL('./schema.json',import.meta.url),'utf8'));
const workbook=Workbook.create();
const green='#234638',ink='#25352E',amber='#FFF6DC';
const instructions=workbook.worksheets.add('Instructions');
instructions.showGridLines=false;instructions.tabColor='#87968B';
instructions.getRange('A1:D58').format={font:{name:'Arial',size:11,color:ink},rowHeight:28,verticalAlignment:'center',wrapText:true};
for(const [col,width]of [['A',28],['B',36],['C',38],['D',42]])instructions.getRange(`${col}1:${col}58`).format.columnWidth=width;
instructions.getRange('A1:B2').values=[['templateVersion','1.0'],['pageType','journey']];
instructions.getRange('A1:B2').setNumberFormat('@');
instructions.getRange('A1:B2').format.font={name:'Arial',size:10,color:'#66766B'};
instructions.getRange('A4:D4').values=[['Journey import','','','Safari Crafters · v1.0']];
instructions.getRange('A4:D4').format.font={name:'Arial',size:16,bold:true,color:green};
const notes=[
 ['Start here','Fill Pages first. Use the same recordId in every related sheet.'],
 ['Safe workflow','Upload → review findings → save drafts. This file never publishes pages.'],
 ['Create / update','Create: choose a new ID and slug. Update: use the CMS record ID and current revision.'],
 ['Preserve your work','Blank update cells keep existing values. Child rows update by itemId; omitted rows are retained.'],
 ['Text guidance','Amber cells are editable. Length guidance warns; button labels over 30 characters block import.'],
 ['File rules','Keep headings unchanged. Use text, not formulas or pasted markup. Maximum 500 rows across all data sheets.'],
 ['Images','Upload images in the CMS first, then paste asset IDs. Desktop hero and mobileHero can use different images.'],
 ['Examples below','Examples illustrate format only. Replace them with verified client content; no example rows are imported.'],
];
notes.forEach((row,i)=>{instructions.getRange(`A${i+6}:B${i+6}`).values=[row];instructions.getRange(`A${i+6}:D${i+6}`).format.rowHeight=58;});
instructions.getRange('B6:B13').format.columnWidth=60;
instructions.getRange('A15:D15').values=[['Field / sheet','Meaning','Length / requirement','Example format only']];
instructions.getRange('A15:D15').format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:32};
const examples={recordId:'journey-forest-01',operation:'create',expectedRevision:'Use the exported revision UUID for updates',slug:'private-forest-journey',title:'A private journey through the forest',description:'Write your short summary here.',intro:'Write the full introduction here.',region:'Enter the verified region',duration:'Enter the verified trip duration',bestMonths:'Enter the verified travel months',groupSize:'Enter the group size',difficulty:'Enter the activity level',price:'Enter verified price guidance',buttonLabel:'Plan this journey',seoTitle:'Write a descriptive search title',seoDescription:'Write a useful search description',itemId:'day-01 / faq-01 / image-01',position:'1',label:'Day 1',copy:'Write this day’s description.',stay:'Enter verified accommodation',question:'What should guests bring?',answer:'Write a verified answer.',role:'hero / mobileHero / gallery',assetId:'Paste the uploaded CMS asset ID',alt:'Describe what this image shows.',caption:'Optional image caption',credit:'Enter the rights holder'};
let guideRow=16;
for(const [name,fields]of Object.entries(schema.sheets)){
 for(const field of fields){
  const guidance=field.key==='expectedRevision'?'Required for updates; blank for create':field.max?`Maximum ${field.max} characters (blocking)`:field.guidance?`${field.guidance.min||0}–${field.guidance.max} ${field.guidance.unit} recommended`:field.required?(name!=='Pages'||['recordId','operation'].includes(field.key)?'Required for every supplied row':'Required for new records'):'Optional / preserve if blank';
  const example=field.key==='itemId'?({Itinerary:'day-01',FAQs:'faq-01',Media:'image-01'}[name]):examples[field.key]||'';
  instructions.getRange(`A${guideRow}:D${guideRow}`).values=[[`${name} · ${field.key}`,field.label,guidance,example]];
  instructions.getRange(`A${guideRow}:D${guideRow}`).format.rowHeight=42;
  if(guideRow%2===0)instructions.getRange(`A${guideRow}:D${guideRow}`).format.fill='#F0F4EF';
  guideRow++;
 }
 const sheet=workbook.worksheets.add(name);sheet.showGridLines=false;sheet.tabColor=green;
 const last=String.fromCharCode(64+fields.length);
 sheet.getRange(`A1:${last}101`).format={font:{name:'Arial',size:11,color:ink},columnWidth:28,rowHeight:38,verticalAlignment:'top',wrapText:true};
 sheet.getRange(`A1:${last}101`).setNumberFormat('@');
 sheet.getRange(`A1:${last}1`).values=[fields.map(f=>f.key)];
 sheet.getRange(`A1:${last}1`).format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:34};
 sheet.getRange(`A2:${last}101`).format.fill=amber;
 sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(name==='Pages'?2:1);
 fields.forEach((field,index)=>{
  const col=String.fromCharCode(65+index);
  if(['copy','intro','description','answer','seoDescription'].includes(field.key))sheet.getRange(`${col}1:${col}101`).format.columnWidth=48;
  if(field.key==='position'){sheet.getRange(`${col}2:${col}101`).setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:1,formula2:500}});}
  if(field.key==='operation')sheet.getRange(`${col}2:${col}101`).dataValidation={rule:{type:'list',values:['create','update']}};
  if(field.key==='role')sheet.getRange(`${col}2:${col}101`).dataValidation={rule:{type:'list',values:['hero','mobileHero','gallery']}};
  if(field.max)sheet.getRange(`${col}2:${col}101`).conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${field.max}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
workbook.recalculate();
await fs.mkdir(new URL('./previews',import.meta.url),{recursive:true});
const views=[['Instructions','A1:D13'],['Instructions','A15:D27'],['Instructions','A28:D40'],['Instructions','A41:D51'],['Pages','A1:D6'],['Pages','E1:H6'],['Pages','I1:L6'],['Pages','M1:P6'],['Itinerary','A1:G6'],['FAQs','A1:E6'],['Media','A1:H6']];
for(let i=0;i<views.length;i++){const [sheetName,range]=views[i];const preview=await workbook.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(new URL(`./previews/${i}.png`,import.meta.url),new Uint8Array(await preview.arrayBuffer()));}
console.log((await workbook.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
await (await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/public/cms/templates/journey-v1.xlsx`);
// Temporary populated fixture proves the exported workbook is usable by the real parser.
workbook.worksheets.getItem('Pages').getRange('A2:P2').values=[['journey-example','create','','forest-example','A private journey through a forest','Example summary for parser verification only.','Example introduction for parser verification only.','Example region','5 nights','To be confirmed','','','','Plan this journey','','']];
workbook.recalculate();await(await SpreadsheetFile.exportXlsx(workbook)).save(new URL('./filled.xlsx',import.meta.url).pathname);
