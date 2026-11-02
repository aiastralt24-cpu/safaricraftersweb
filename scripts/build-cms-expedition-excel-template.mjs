// Run a copy from a writable directory with the bundled artifact-tool dependency.
import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const [root,schemaPath,outputDir]=process.argv.slice(2);
if(!root||!schemaPath||!outputDir)throw Error('Pass repository, schema JSON and QA output directory.');
const schema=JSON.parse(await fs.readFile(schemaPath,'utf8')),workbook=Workbook.create();
const green='#234638',ink='#25352E',amber='#FFF8E7';
const guide=workbook.worksheets.add('Instructions');guide.showGridLines=false;
guide.getRange('A1:D220').format={font:{name:'Arial',size:11,color:ink},rowHeight:32,wrapText:true,verticalAlignment:'center'};
for(const [col,width]of [['A',30],['B',65],['C',38],['D',42]])guide.getRange(`${col}1:${col}220`).format.columnWidth=width;
guide.getRange('A1:B2').values=[['templateVersion',schema.version],['pageType',schema.type]];
guide.getRange('A4:B4').values=[['Photography expedition import','Safari Crafters']];guide.getRange('A4:B4').format.font={name:'Arial',size:16,bold:true,color:green};
const instructions=[
 ['Start with Pages','Choose create or update. Repeat recordId in all related sheets. Up to 25 expeditions per file.'],
 ['Update safely','Use the CMS record UUID and current expectedRevision. Keep the URL slug and English locale en unchanged.'],
 ['Preserve or replace','Omitted Content fields stay unchanged. A supplied Content row with a blank value clears that field.'],
 ['Replace collections','List complete collection names in replaceCollections. See the field guide below. Listed collections without rows are cleared; omitted collections stay unchanged.'],
 ['Dates and prices','Enter dates as text YYYY-MM-DD. Departure status is New, Filling fast, Full or Available. Keep price and dateLabel as exact wording.'],
 ['Images and references','Upload media first; use CMS IDs with credits and alt text. References selects mentor, guide or enquiryForm. Film persistence is not yet supported.'],
 ['Workbook limits','Maximum 500 data rows, 5 MB and 32767 characters per Excel cell. Use Word or the editor for longer text. No cell formulas, macros or embedded pictures.'],
 ['Cell colors','Amber cells accept content. Red marks text over the column limit. Review enforces field-specific limits and word guidance without truncating text.'],
 ['Save drafts','When expedition Office imports are available, upload, review every draft and warning, then save. Importing never publishes.'],
];
instructions.forEach((row,i)=>{guide.getRange(`A${i+6}:B${i+6}`).values=[row];guide.getRange(`A${i+6}:D${i+6}`).format.rowHeight=i===3||i===6?86:68;});
guide.getRange('A16:D16').values=[['Field or table','Meaning','Limits and guidance','Example only']];guide.getRange('A16:D16').format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:32};
let r=17;guide.getRange(`A${r}:D${r}`).values=[['replaceCollections','departures, days, highlights, inclusions, exclusions, body, faqs, image, heroImage, mobileHeroImage, gallery, seo.socialImage, specialists, enquiry.form, video, video.poster','Replace video includes its poster. Do not also list video.poster.','']];guide.getRange(`A${r}:D${r}`).format.rowHeight=80;r++;
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
  if(['text','value','caption','title'].includes(field.key))sheet.getRange(`${col}1:${col}101`).format.columnWidth=45;
  const choices=field.key==='operation'?['create','update']:field.key==='locale'?['en']:field.key==='status'?['New','Filling fast','Full','Available']:field.key==='collection'?['highlights','inclusions','exclusions','body']:field.key==='role'?(name==='References'?['mentor','guide','enquiryForm']:['image','heroImage','mobileHeroImage','gallery','video.poster','seo.socialImage']):field.key==='decorative'?['true','false']:null;
  if(choices)range.dataValidation={rule:{type:'list',values:choices}};
  if(field.key==='position'){range.setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:1,formula2:500}});}
  if(field.max)range.conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${Math.min(field.max,32767)}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
for(const [field,rule]of Object.entries(schema.contentFields)){guide.getRange(`A${r}:D${r}`).values=[[`Content: ${field}`,'Use this field name in Content',`Maximum ${rule.max} characters`,rule.guidance?`Recommended ${rule.guidance.max} ${rule.guidance.unit}`:({geography:'India / International',programmeStatus:'preview / confirmed','booking.button.newWindow':'true / false','seo.indexing':'inherit / index / noindex','seo.following':'inherit / follow / nofollow','seo.sitemap':'inherit / include / exclude'}[field]??'')]];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
workbook.recalculate();await fs.mkdir(outputDir,{recursive:true});
console.log((await workbook.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
const scalarStart=18+Object.values(schema.sheets).reduce((sum,fields)=>sum+fields.length,0);
const views=[['Instructions',`A${scalarStart}:D${scalarStart+7}`],['Instructions','A4:B14'],['Instructions','A16:D24'],...Object.entries(schema.sheets).map(([name,fields])=>[name,`A1:${String.fromCharCode(64+fields.length)}5`])];
for(const [index,[sheetName,range]] of views.entries()){const blob=await workbook.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(`${outputDir}/${index}.png`,new Uint8Array(await blob.arrayBuffer()));}
await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/public/cms/templates/expedition-v1.xlsx`);
workbook.worksheets.getItem('Pages').getRange('A2:G2').values=[['expedition-excel-example','create','','excel-forest','Forest expedition','en','']];
workbook.worksheets.getItem('Content').getRange('A2:C2').values=[['expedition-excel-example','intro','Original text\nSecond line']];
workbook.worksheets.getItem('Departures').getRange('A2:G2').values=[['expedition-excel-example','departure-1',1,'2028-02-29','2028-03-03','Full','Waitlist']];
workbook.recalculate();await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/tests/fixtures/expedition-v1-filled.xlsx`);
// Disposable boundary check after both deliverables are saved.
const boundary=workbook.worksheets.getItem('Pages');boundary.getRange('E2').values=[['x'.repeat(201)]];boundary.getRange('A2:G2').format.rowHeight=110;workbook.recalculate();
const warning=await workbook.render({sheetName:'Pages',range:'D1:F3',scale:1,format:'png'});await fs.writeFile(`${outputDir}/length-warning.png`,new Uint8Array(await warning.arrayBuffer()));
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},summary:'formula errors'})).ndjson);
await Promise.all([`${root}/public/cms/templates/expedition-v1.xlsx.inspect.ndjson`,`${root}/tests/fixtures/expedition-v1-filled.xlsx.inspect.ndjson`].map(path=>fs.rm(path,{force:true})));
