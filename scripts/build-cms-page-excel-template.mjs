// Run a copy from a writable directory with the bundled artifact-tool dependency.
import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const [root,schemaPath,outputDir]=process.argv.slice(2);
if(!root||!schemaPath||!outputDir)throw Error('Pass repository, schema JSON and QA output directory.');
const schema=JSON.parse(await fs.readFile(schemaPath,'utf8')),workbook=Workbook.create();
const green='#234638',ink='#25352E',amber='#FFF8E7';
const guide=workbook.worksheets.add('Instructions');guide.showGridLines=false;
guide.getRange('A1:D180').format={font:{name:'Arial',size:11,color:ink},rowHeight:32,wrapText:true,verticalAlignment:'center'};
for(const [col,width]of [['A',30],['B',65],['C',38],['D',42]])guide.getRange(`${col}1:${col}180`).format.columnWidth=width;
guide.getRange('A1:B2').values=[['templateVersion',schema.version],['pageType',schema.type]];
guide.getRange('A4:B4').values=[['Editorial page import','Safari Crafters']];guide.getRange('A4:B4').format.font={name:'Arial',size:16,bold:true,color:green};
const instructions=[
 ['Start with Pages','Create up to 25 English custom pages. Use a stable recordId throughout the file. New URLs must be outside existing website routes.'],
 ['Update safely','Use the CMS record UUID and latest expectedRevision. Keep path and locale unchanged. Use en for locale.'],
 ['Preserve sections','For metadata-only updates, omit section and child rows. Existing sections remain. A supplied blank SEO value clears that field.'],
 ['Replace all sections','Set replaceSections to true before supplying section rows on update. The entire section list is replaced, including omitted sections. Review removals.'],
 ['Connect content','Sections joins to Pages by recordId. Other sheets use recordId and sectionId. Use unique IDs and positive positions within each parent.'],
 ['Images and PDFs','Use approved CMS image IDs. Downloads require documentId and its exact published versionId. Do not embed files or paste storage URLs.'],
 ['Limits','Maximum 500 data rows across sheets; 5 MB file. Keep headers unchanged. No formulas or macros. No text is automatically shortened.'],
 ['Cell guidance','Amber cells are editable. Red highlights text over the column limit. Field-specific and Unicode limits are enforced during CMS review.'],
 ['Save drafts','Upload in Pages, review every proposal and warning, acknowledge the changes, then save drafts. Importing does not publish or add menu entries.'],
];
instructions.forEach((row,i)=>{guide.getRange(`A${i+6}:B${i+6}`).values=[row];guide.getRange(`A${i+6}:D${i+6}`).format.rowHeight=i===3?76:62;});
guide.getRange('A16:D16').values=[['Field or table','Meaning','Limits and guidance','Example only']];guide.getRange('A16:D16').format={fill:green,font:{name:'Arial',size:11,color:'#FFFFFF',bold:true},rowHeight:32};
let r=17;
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
  const choices=field.key==='operation'?['create','update']:field.key==='kind'?(name==='Sections'?['hero','text','imageText','cards','cta','downloads']:['paragraph','list','link']):field.key==='target'?['desktop','mobile','image','card']:field.key==='headingLevel'?['h1','h2','h3']:['ordered','decorative','visible','replaceSections','newWindow'].includes(field.key)?['true','false']:null;
  if(choices)range.dataValidation={rule:{type:'list',values:choices}};
  if(field.key==='position'){range.setNumberFormat('0');sheet.dataValidations.add({range:`${col}2:${col}101`,rule:{type:'whole',operator:'between',formula1:1,formula2:500}});}
  if(field.max)range.conditionalFormats.add('expression',{formula:`=LEN(${col}2)>${field.max}`,format:{fill:'#FBE4E3',font:{color:'#9C2424',bold:true}}});
 });
}
for(const [table,fields]of [['SectionContent',schema.contentFields],['SEO',schema.seoFields]])for(const [field,rule]of Object.entries(fields)){guide.getRange(`A${r}:D${r}`).values=[[`${table}: ${field}`,'Use in the field column',`Maximum ${rule.max} characters`,rule.recommended?`Recommended ${rule.recommended} characters`:'']];guide.getRange(`A${r}:D${r}`).format.rowHeight=46;r++;}
const notes=[['Section rules','hero: title, copy, desktop image and optional buttons. text: optional title and Blocks. imageText: title, Blocks, one image and optional button.'],['Cards and actions','cards: title, columns 2/3/4 and Cards rows. cta: title, copy and 1-2 Buttons. downloads: title and version-pinned Downloads rows.'],['Stricter limits','Button labels: 30 characters. Anchor: 80 lowercase letters/digits/hyphens, beginning with a letter. Section headings: recommended 80, maximum 200.'],['Simple example','Pages: recordId guide, operation create, path /field-guide, title Field guide, locale en. Sections: guide, intro, 1, text, Introduction, h1.'],['Example text','SectionContent: guide, intro, title, Field guide. Blocks: guide, intro, paragraph-1, 1, paragraph, Your approved introductory copy.'],['SEO choices','indexing: inherit/index/noindex. following: inherit/follow/nofollow. sitemap: inherit/include/exclude. canonical: absolute HTTPS URL.'],['Layout controls','background: paper/white/forest/ink; width: reading/content/full; spacing: compact/standard/generous; animation: none/fade/reveal.'],['Image targets','hero uses desktop/mobile; imageText uses image; cards uses card plus the matching itemId. Nondecorative images need alternative text.'],['Text fields','SectionContent supports title, titleAccent, eyebrow, copy, introduction, columns, layout only where the section supports them. Use Blocks for paragraphs and lists.']];
for(const row of notes){guide.getRange(`A${r}:B${r}`).values=[row];guide.getRange(`A${r}:D${r}`).format.rowHeight=88;r++;}
workbook.recalculate();await fs.mkdir(outputDir,{recursive:true});
console.log((await workbook.inspect({kind:'table',range:'Instructions!A1:B2',include:'values',tableMaxRows:2,tableMaxCols:2})).ndjson);
const views=[['Instructions','A4:B14'],['Instructions','A16:D24'],...Object.entries(schema.sheets).flatMap(([name,fields])=>Array.from({length:Math.ceil(fields.length/5)},(_,i)=>[name,`${String.fromCharCode(65+i*5)}1:${String.fromCharCode(64+Math.min(fields.length,(i+1)*5))}4`]))];
for(const [index,[sheetName,range]] of views.entries()){const blob=await workbook.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(`${outputDir}/${index}.png`,new Uint8Array(await blob.arrayBuffer()));}
await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/public/cms/templates/page-v1.xlsx`);
workbook.worksheets.getItem('Pages').getRange('A2:G2').values=[['page-example','create','','/field-guide','Field guide','en','']];
workbook.worksheets.getItem('Sections').getRange('A2:F2').values=[['page-example','intro',1,'text','Introduction','h1']];
workbook.worksheets.getItem('SectionContent').getRange('A2:D2').values=[['page-example','intro','title','Field guide']];
workbook.worksheets.getItem('Blocks').getRange('A2:F2').values=[['page-example','intro','paragraph-1',1,'paragraph','Original text\nSecond line']];
workbook.recalculate();await(await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/tests/fixtures/page-v1-filled.xlsx`);
// Disposable boundary check after both deliverables are saved.
const boundary=workbook.worksheets.getItem('Pages');boundary.getRange('E2').values=[['x'.repeat(201)]];boundary.getRange('A2:G2').format.rowHeight=110;workbook.recalculate();
const warning=await workbook.render({sheetName:'Pages',range:'D1:F3',scale:1,format:'png'});await fs.writeFile(`${outputDir}/length-warning.png`,new Uint8Array(await warning.arrayBuffer()));
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},summary:'formula errors'})).ndjson);
await Promise.all([`${root}/public/cms/templates/page-v1.xlsx.inspect.ndjson`,`${root}/tests/fixtures/page-v1-filled.xlsx.inspect.ndjson`].map(path=>fs.rm(path,{force:true})));
