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
guide.getRange('A4:B4').values=[['Product category import','Safari Crafters']];guide.getRange('A4:B4').format.font={name:'Arial',size:16,bold:true,color:green};
const instructions=schema.instructions;
instructions.forEach((row,i)=>{guide.getRange(`A${i+6}:B${i+6}`).values=[row];guide.getRange(`A${i+6}:D${i+6}`).format.rowHeight=95;});
guide.getRange('A21:D21').values=[['Field or table','Meaning','Limits and guidance','Example only']];guide.getRange('A21:D21').format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:32};
let r=22;
for(const [name,fields]of Object.entries(schema.sheets)){
 for(const field of fields){guide.getRange(`A${r}:D${r}`).values=[[`${name}.${field.key}`,field.label,`${field.required?'Required. ':''}Maximum ${field.max} characters.`,field.key==='position'?'0':field.key==='operation'?'create / update':field.key==='locale'?'en':field.key==='decorative'||field.key==='ordered'?'true / false':'']];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
 const sheet=workbook.worksheets.add(name);sheet.showGridLines=false;
 const last=String.fromCharCode(64+fields.length);
 sheet.getRange(`A1:${last}101`).format={font:{name:'Arial',size:11,color:ink},columnWidth:25,rowHeight:36,wrapText:true,verticalAlignment:'center'};
 sheet.getRange(`A1:${last}101`).setNumberFormat('@');sheet.getRange(`A1:${last}1`).values=[fields.map(f=>f.key)];
 sheet.getRange(`A1:${last}1`).format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:36};sheet.getRange(`A2:${last}101`).format.fill=amber;
 sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(1);
 fields.forEach((field,index)=>{
  const col=String.fromCharCode(65+index),range=sheet.getRange(`${col}2:${col}101`);
  if(['text','value','caption','title'].includes(field.key))sheet.getRange(`${col}1:${col}101`).format.columnWidth=45;
  const choices=field.key==='operation'?['create','update']:field.key==='valueType'?['text','number','boolean','choice']:['required','allowNotApplicable','filterEligible','comparisonEligible','decorative'].includes(field.key)?['true','false']:null;
  if(choices)range.dataValidation={rule:{type:'list',values:choices}};
  if(field.key==='position'){range.setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:0,formula2:999}});}
  if(field.max)range.conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${field.max}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
for(const [field,rule]of Object.entries(schema.contentFields)){guide.getRange(`A${r}:D${r}`).values=[[`Content: ${field}`,'Use this field name in Content',`Maximum ${rule.max} characters`,rule.guidance?`Recommended ${rule.guidance.max} ${rule.guidance.unit}`:'']];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
const content=workbook.worksheets.getItem('Content');
content.getRange('B2:B101').dataValidation={rule:{type:'list',values:Object.keys(schema.contentFields)}};
for(const [field,rule]of Object.entries(schema.contentFields))content.getRange('C2:C101').conditionalFormats.add('expression',{formula:`=AND($B2="${field}",LEN(C2)>${rule.max})`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
workbook.recalculate();await fs.mkdir(outputDir,{recursive:true});
console.log((await workbook.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
const views=[['Instructions','A4:B13'],['Instructions','A21:D29'],...Object.entries(schema.sheets).map(([name,fields])=>[name,`A1:${String.fromCharCode(64+fields.length)}5`])];
for(const [index,[sheetName,range]] of views.entries()){const blob=await workbook.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(`${outputDir}/${index}.png`,new Uint8Array(await blob.arrayBuffer()));}
await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/public/cms/templates/product-category-v1.xlsx`);
for(const [name,rows] of Object.entries(schema.samples)){
 const fields=schema.sheets[name];
 workbook.worksheets.getItem(name).getRange(`A2:${String.fromCharCode(64+fields.length)}${rows.length+1}`).values=rows.map(row=>fields.map(field=>row[field.key]??''));
}
workbook.recalculate();await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/tests/fixtures/product-category-v1-filled.xlsx`);
// Disposable boundary check after both deliverables are saved.
const boundary=workbook.worksheets.getItem('Pages');boundary.getRange('E2').values=[['x'.repeat(201)]];boundary.getRange('A2:H2').format.rowHeight=110;workbook.recalculate();
const warning=await workbook.render({sheetName:'Pages',range:'D1:F3',scale:1,format:'png'});await fs.writeFile(`${outputDir}/length-warning.png`,new Uint8Array(await warning.arrayBuffer()));
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},summary:'formula errors'})).ndjson);
await Promise.all([`${root}/public/cms/templates/product-category-v1.xlsx.inspect.ndjson`,`${root}/tests/fixtures/product-category-v1-filled.xlsx.inspect.ndjson`].map(path=>fs.rm(path,{force:true})));
