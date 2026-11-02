// Run a copy from a writable directory with the bundled artifact-tool dependency.
import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const [root,schemaPath,outputDir]=process.argv.slice(2);
if(!root||!schemaPath||!outputDir)throw Error('Pass repository, schema JSON and QA output directory.');
const schema=JSON.parse(await fs.readFile(schemaPath,'utf8')),workbook=Workbook.create();
const green='#234638',ink='#25352E',amber='#FFF8E7';
const guide=workbook.worksheets.add('Instructions');guide.showGridLines=false;
guide.getRange('A1:D150').format={font:{name:'Arial',size:11,color:ink},rowHeight:32,wrapText:true,verticalAlignment:'center'};
for(const [col,width]of [['A',30],['B',65],['C',38],['D',42]])guide.getRange(`${col}1:${col}150`).format.columnWidth=width;
guide.getRange('A1:B2').values=[['templateVersion',schema.version],['pageType',schema.type]];
guide.getRange('A4:B4').values=[['FAQ import','Safari Crafters']];guide.getRange('A4:B4').format.font={name:'Arial',size:16,bold:true,color:green};
const instructions=[
 ['Start with Pages','Choose create or update. Repeat recordId in each related sheet. Up to 25 FAQs per file.'],
 ['Update safely','Use the CMS record UUID and latest expectedRevision. Keep the existing locale unchanged.'],
 ['Preserve or replace','Omitted Content fields stay unchanged. A supplied Content row with a blank value clears that field.'],
 ['Replace collections','List answer, keywords or relationships.GROUP in replaceCollections. Listed collections without rows are cleared. GROUP is pages, products, destinations or documents.'],
 ['Answer structure','Blocks supports paragraph, list, quote, table and link. Tables need one header record and ordered rows with the same blockId. Lists use ListItems.'],
 ['Related records','Use existing CMS record UUIDs in Relationships. Imports do not publish related records or change ownership.'],
 ['Dates and limits','Enter dates as text YYYY-MM-DD. Keep headings unchanged. Maximum 500 data rows and a 5 MB file. No formulas or macros.'],
 ['Cell colors','Amber cells accept content. Red marks text over the column limit. CMS review checks all field rules and never truncates text.'],
 ['Text formatting','In paragraph Blocks.text and ListItems.text, bold, italic, superscript and subscript are supported. Maximum 200 formatted parts per cell.'],
 ['Formatting limits','Underline and strikethrough are rejected in text cells. Website styling controls fonts and colors. Other fields do not import formatting. Use link blocks for URLs.'],
 ['Save drafts','When FAQ import is available, upload, review every proposed change and save explicitly. Importing never approves or publishes.'],
];
instructions.forEach((row,i)=>{guide.getRange(`A${i+6}:B${i+6}`).values=[row];guide.getRange(`A${i+6}:D${i+6}`).format.rowHeight=i===3?150:i===4?110:[8,9].includes(i)?90:62;});
guide.getRange('A18:D18').values=[['Field or table','Meaning','Limits and guidance','Example only']];guide.getRange('A18:D18').format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:32};
let r=19;
for(const [name,fields]of Object.entries(schema.sheets)){
 for(const field of fields){guide.getRange(`A${r}:D${r}`).values=[[`${name}.${field.key}`,field.label,`${field.required?'Required. ':''}Maximum ${field.max} characters.`,field.key==='position'?'1':field.key==='operation'?'create / update':field.key==='locale'?'en':field.key==='decorative'||field.key==='ordered'?'true / false':'']];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
 const sheet=workbook.worksheets.add(name);sheet.showGridLines=false;
 const last=String.fromCharCode(64+fields.length);
 sheet.getRange(`A1:${last}101`).format={font:{name:'Arial',size:11,color:ink},columnWidth:25,rowHeight:36,wrapText:true,verticalAlignment:'center'};
 sheet.getRange(`A1:${last}101`).setNumberFormat('@');sheet.getRange(`A1:${last}1`).values=[fields.map(f=>f.key)];
 sheet.getRange(`A1:${last}1`).format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:36};sheet.getRange(`A2:${last}101`).format.fill=amber;
 sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(1);
 fields.forEach((field,index)=>{
  const col=String.fromCharCode(65+index),range=sheet.getRange(`${col}2:${col}101`);
  if(['text','value','caption','question'].includes(field.key))sheet.getRange(`${col}1:${col}101`).format.columnWidth=45;
  const choices=field.key==='operation'?['create','update']:field.key==='kind'?['paragraph','list','quote','table','link']:field.key==='role'?(name==='Tables'?['header','row']:['image','gallery','seo.socialImage']):field.key==='section'?['body','challenge','approach','outcomes']:field.key==='group'?['pages','products','destinations','documents']:['ordered','decorative'].includes(field.key)?['true','false']:null;
  if(choices)range.dataValidation={rule:{type:'list',values:choices}};
  if(field.key==='position'){range.setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:1,formula2:500}});}
  if(field.max)range.conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${field.max}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
for(const [field,rule]of Object.entries(schema.contentFields)){guide.getRange(`A${r}:D${r}`).values=[[`Content: ${field}`,'Use this field name in Content',`Maximum ${rule.max} characters`,rule.guidance?`Recommended ${rule.guidance.max} ${rule.guidance.unit}`:'']];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
workbook.recalculate();await fs.mkdir(outputDir,{recursive:true});
console.log((await workbook.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
const views=[['Instructions','A4:B16'],['Instructions','A18:D26'],['Pages','A1:F5'],['Content','A1:C5'],['Blocks','A1:H5'],['Blocks','I1:J5'],['ListItems','A1:E5'],['Relationships','A1:E5'],['Keywords','A1:D5'],['Tables','A1:F5'],['Tables','G1:M5']];
for(const [index,[sheetName,range]] of views.entries()){const blob=await workbook.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(`${outputDir}/${index}.png`,new Uint8Array(await blob.arrayBuffer()));}
await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/public/cms/templates/faq-v1.xlsx`);
for(const [name,rows] of Object.entries(schema.samples)){
 const fields=schema.sheets[name];
 workbook.worksheets.getItem(name).getRange(`A2:${String.fromCharCode(64+fields.length)}${rows.length+1}`).values=rows.map(row=>fields.map(field=>row[field.key]??''));
}
workbook.recalculate();await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/tests/fixtures/faq-v1-filled.xlsx`);
// Disposable boundary check after both deliverables are saved.
const boundary=workbook.worksheets.getItem('Pages');boundary.getRange('D2').values=[['x'.repeat(201)]];boundary.getRange('A2:G2').format.rowHeight=110;workbook.recalculate();
const warning=await workbook.render({sheetName:'Pages',range:'C1:E3',scale:1,format:'png'});await fs.writeFile(`${outputDir}/length-warning.png`,new Uint8Array(await warning.arrayBuffer()));
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},summary:'formula errors'})).ndjson);
await Promise.all([`${root}/public/cms/templates/faq-v1.xlsx.inspect.ndjson`,`${root}/tests/fixtures/faq-v1-filled.xlsx.inspect.ndjson`].map(path=>fs.rm(path,{force:true})));
