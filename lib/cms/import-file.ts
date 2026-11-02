import {productTemplate} from './product-import-contract.ts';
import {productCategoryTemplate} from './product-category-import-contract.ts';
import {partnerTemplate} from './partner-import-contract.ts';
import {certificationTemplate} from './certification-import-contract.ts';
import {careerTemplate} from './career-import-contract.ts';
import {locationTemplate} from './location-import-contract.ts';
import {applicationTemplate} from './application-import-contract.ts';
import {leadershipTemplate} from './leadership-import-contract.ts';
import {eventTemplate} from './event-import-contract.ts';
import {newsTemplate} from './news-import-contract.ts';
import {faqTemplate} from './faq-import-contract.ts';
import {projectTemplate} from './project-import-contract.ts';
/** Server-only OOXML boundary. This module never fetches links or writes content. */
import type {z} from 'zod';
import {excelInlineSpans,wordInlineSpans,wordStyleGuard,officeFormattingSchema} from './office-inline-formatting.ts';
import {fromBuffer} from 'yauzl';
import {XMLParser, XMLValidator} from 'fast-xml-parser';
import {posix} from 'node:path';
import {createHash} from 'node:crypto';
import {destinationTemplate} from './destination-import-contract.ts';
import {journalTemplate} from './journal-import-contract.ts';
import {expeditionTemplate} from './photo-expedition-import-contract.ts';
const journeySections=['Pages','Itinerary','FAQs','Media'];
const destinationSections=Object.keys(destinationTemplate.sheets);

export const FILE_LIMITS = {bytes: 5_000_000, entries: 200, expanded: 20_000_000, part: 5_000_000};
export class ImportFileError extends Error {
  constructor(message: string) { super(message); this.name = 'ImportFileError'; }
}
function fail(message: string): never { throw new ImportFileError(message); }
type Xml = Record<string, any>; // XML is untrusted; each consumed shape is checked below.
const list = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
// Decode numeric character references emitted by Office save operations in both parser modes.
// DTD/entity declarations remain rejected before parsing.
const parser = new XMLParser({htmlEntities:true,ignoreAttributes:false, parseTagValue:false, parseAttributeValue:false, trimValues:false, removeNSPrefix:true});
function xml(bytes: Buffer): Xml {
  const text = bytes.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(text) || text.includes('\0')) fail('XML declarations and non-UTF-8 content are unsupported.');
  if (XMLValidator.validate(text) !== true) fail('The file contains malformed XML.');
  return parser.parse(text);
}

/** Sequential bounded inflation: declared and actual byte limits are both enforced. */
export function readOfficeArchive(bytes: Buffer): Promise<Map<string, Buffer>> {
  if (!bytes.length || bytes.length > FILE_LIMITS.bytes) return Promise.reject(new ImportFileError('Upload a file no larger than 5 MB.'));
  return new Promise((resolve,reject) => {
    fromBuffer(bytes,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(error,zip) => {
      if (error || !zip) { reject(new ImportFileError('This is not a readable Office file.')); return; }
      let total = 0, count = 0, stopped = false;
      const parts = new Map<string,Buffer>();
      const names = new Set<string>();
      const stop = (error: unknown) => { if (stopped) return; stopped=true; zip.close(); reject(error instanceof ImportFileError ? error : new ImportFileError('The Office archive is damaged.')); };
      zip.on('error',stop);
      zip.on('end',() => { if (!stopped) { stopped=true; resolve(parts); } });
      zip.on('entry',entry => {
        if (stopped) return;
        const name = entry.fileName;
        if (++count > FILE_LIMITS.entries || names.has(name.toLowerCase()) || entry.isEncrypted() || entry.uncompressedSize > FILE_LIMITS.part || total + entry.uncompressedSize > FILE_LIMITS.expanded) { stop(new ImportFileError('The archive exceeds safe limits or contains duplicate/encrypted entries.')); return; }
        names.add(name.toLowerCase());
        if (/vbaProject|externalLinks\/|embeddings\/|activeX\//i.test(name)) { stop(new ImportFileError('Macros, external workbook links and embedded objects are not accepted.')); return; }
        if (name.endsWith('/')) { zip.readEntry(); return; }
        zip.openReadStream(entry,(error,stream) => {
          if (error || !stream) { stop(error); return; }
          const chunks: Buffer[] = []; let size = 0;
          stream.on('error',stop);
          stream.on('data',(chunk: Buffer) => {
            size += chunk.length; total += chunk.length;
            if (size > FILE_LIMITS.part || total > FILE_LIMITS.expanded) { stream.destroy(); stop(new ImportFileError('Expanded file exceeds safe limits.')); return; }
            chunks.push(chunk);
          });
          stream.on('end',() => { if (!stopped) { parts.set(name,Buffer.concat(chunks)); zip.readEntry(); } });
        });
      });
      zip.readEntry();
    });
  });
}

function part(parts: Map<string,Buffer>, name: string): Xml {
  const value=parts.get(name); if (!value) return fail(`Required file part is missing: ${name}`);
  return xml(value);
}
function checkOfficeParts(parts: Map<string,Buffer>) {
  const types=part(parts,'[Content_Types].xml');
  if (/macroEnabled|vbaProject/i.test(JSON.stringify(types))) fail('Macro-enabled files are not accepted.');
  for (const [name,data] of parts) {
    if (!name.endsWith('.rels')) continue;
    for (const rel of list<Xml>(xml(data).Relationships?.Relationship)) {
      if (rel['@_TargetMode'] === 'External') fail('External relationships are not accepted. Remove external links.');
    }
  }
}
function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) return String((value as Xml)['#text']);
  return '';
}
function richText(value: Xml | undefined): string {
  if (!value) return '';
  return value.t !== undefined ? textValue(value.t) : list<Xml>(value.r).map(run=>textValue(run.t)).join('');
}

/** v1 workbook: metadata in Instructions A1:B2; stable column keys in row 1. */
async function parseXlsx(bytes: Buffer, sections: string[], preserveJournalFormatting=false) {
  const parts=await readOfficeArchive(bytes);
  checkOfficeParts(parts);
  const workbook=part(parts,'xl/workbook.xml').workbook;
  const rels=list<Xml>(part(parts,'xl/_rels/workbook.xml.rels').Relationships?.Relationship);
  const sharedRaw=parts.has('xl/sharedStrings.xml')?list<Xml>(part(parts,'xl/sharedStrings.xml').sst?.si):[];
  const shared=sharedRaw.map(richText);
  const styles=preserveJournalFormatting&&parts.has('xl/styles.xml')?part(parts,'xl/styles.xml').styleSheet:undefined;
  const fonts=list<Xml>(styles?.fonts?.font),formats=list<Xml>(styles?.cellXfs?.xf);
  const formatting:z.infer<typeof officeFormattingSchema>=[];
  const sheets: Record<string, Record<string,string>[]> = {};
  let templateVersion='',pageType='', rowCount=0;
  const seen=new Set<string>();
  for (const sheet of list<Xml>(workbook?.sheets?.sheet)) {
    const name=sheet['@_name'];
    if (!['Instructions',...sections].includes(name) || seen.has(name)) fail('Use only the original, uniquely named template sheets.');
    seen.add(name);
    const rel=rels.find(r=>r['@_Id']===sheet['@_id']);
    const target=rel?.['@_Target'];
    if (typeof target !== 'string' || !String(rel?.['@_Type']).endsWith('/worksheet')) fail('Invalid worksheet reference.');
    const path=target.startsWith('/') ? target.slice(1) : posix.normalize(posix.join('xl',target));
    if (!path.startsWith('xl/worksheets/')) fail('Invalid worksheet path.');
    const worksheet=part(parts,path).worksheet;
    if (worksheet?.mergeCells) fail(`${name}: merged cells are unsupported in import sheets.`);
    const rows=new Map<number,Map<number,string>>();
    const rawCells=new Map<string,Xml>();
    const numericCells: {column:number;row:number}[]=[];
    for (const row of list<Xml>(worksheet?.sheetData?.row)) {
      const number=Number(row['@_r']);
      if (!Number.isInteger(number) || number<1 || number>501 || rows.has(number)) fail(`${name}: invalid or duplicate row number.`);
      const cells=new Map<number,string>(); rows.set(number,cells);
      for (const cell of list<Xml>(row.c)) {
        const match=/^([A-Z]{1,2})([1-9][0-9]*)$/.exec(cell['@_r'] || '');
        if (!match || Number(match[2])!==number) fail(`${name}: invalid cell address.`);
        const column=[...match[1]].reduce((value,char)=>value*26+char.charCodeAt(0)-64,0);
        if (column>32 || cells.has(column)) fail(`${name}: too many or duplicate columns.`);
        if (cell.f !== undefined) fail(`${name}!${cell['@_r']}: paste text values instead of formulas.`);
        const type=cell['@_t'];
        let value='';
        if (type==='s') {
          const index=Number(cell.v);
          if (!/^\d+$/.test(String(cell.v)) || !Number.isSafeInteger(index) || shared[index]===undefined) fail('Invalid shared text reference.');
          value=shared[index];
        } else if (type==='inlineStr') value=richText(cell.is);
        else if (type===undefined || type==='n' || type==='str') {
          value=textValue(cell.v);
          if (value && type!=='str') numericCells.push({column,row:number});
        }
        else fail(`${name}!${cell['@_r']}: use text cells; dates, errors and booleans are unsupported.`);
        cells.set(column,value);rawCells.set(`${number}:${column}`,cell);
      }
    }
    if (name==='Instructions') {
      if (numericCells.some(cell=>cell.row<=2)) fail('Store template metadata as text.');
      if (rows.get(1)?.get(1)!=='templateVersion' || rows.get(2)?.get(1)!=='pageType') fail('Template metadata is missing.');
      templateVersion=rows.get(1)?.get(2)||''; pageType=rows.get(2)?.get(2)||''; continue;
    }
    const header=rows.get(1); if (!header?.size) fail(`${name}: column headings are missing.`);
    const keys=[...header.values()];
    if (numericCells.some(cell=>cell.row===1 || header.get(cell.column)!=='position')) fail(`${name}: store content as text; only display order accepts numbers.`);
    if (new Set(keys).size!==keys.length || keys.some(key=>!key || ['__proto__','constructor','prototype'].includes(key))) fail(`${name}: invalid column headings.`);
    const output: Record<string,string>[]=[];
    for (let number=2; number<=Math.max(...rows.keys()); number++) {
      const cells=rows.get(number);
      const result: Record<string,string>={};
      for (const [column,value] of cells || []) {
        if (!value.trim()) continue;
        const key=header.get(column); if (!key) fail(`${name}: content appears under a missing heading.`);
        result[key]=value;
      }
      if(preserveJournalFormatting&&(name==='ListItems'||name==='Blocks'&&result.kind==='paragraph')&&result.text!==undefined){
        const column=[...header].find(([,key])=>key==='text')?.[0],cell=rawCells.get(`${number}:${column}`);
        if(cell){try{
          let font:Xml|undefined;
          if(styles||cell['@_s']!==undefined){const style=String(cell['@_s']??'0');if(!/^\d+$/.test(style)||!formats[Number(style)])fail(`${name}: invalid text style reference.`);
            const format=formats[Number(style)];let inherited:Xml|undefined;
            if(format['@_xfId']!==undefined){const index=String(format['@_xfId']),bases=list<Xml>(styles?.cellStyleXfs?.xf);if(!/^\d+$/.test(index)||!bases[Number(index)])fail(`${name}: invalid inherited text style.`);inherited=bases[Number(index)];}
            const apply=String(format['@_applyFont']??'1');if(!['0','1','false','true'].includes(apply))fail(`${name}: unsupported font inheritance.`);
            const fontId=(['0','false'].includes(apply)?inherited?.['@_fontId']:format['@_fontId']??inherited?.['@_fontId'])??'0';
            if(!/^\d+$/.test(String(fontId))||!fonts[Number(fontId)])fail(`${name}: invalid text font reference.`);font=fonts[Number(fontId)];
          }
          const raw=cell['@_t']==='s'?sharedRaw[Number(cell.v)]:cell.is;
          const spans=excelInlineSpans(raw,font,result.text);if(spans)formatting.push({sheet:name,row:number,field:'text',spans});
        }catch(error){fail(`${name}, row ${number}: ${error instanceof Error?error.message:'Unsupported text formatting.'}`);}}
      }
      // Preserve blank rows for original worksheet row numbers; the contract skips them.
      output.push(result);
    }
    while(output.length && !Object.keys(output[output.length-1]).length)output.pop();
    rowCount+=output.length;
    if (rowCount>500) fail('An import supports at most 500 data rows across sheets.');
    sheets[name]=output;
  }
  return {input:{templateVersion,pageType,sheets,...(formatting.length?{formatting}:{})},source:{format:'xlsx' as const,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}};
}

/** Structured Word tables only; body prose is instructions, never inferred page content. */
async function parseDocx(bytes: Buffer, sections: string[], marker: string, preserveJournalFormatting=false) {
  const parts=await readOfficeArchive(bytes); checkOfficeParts(parts);
  const document=parts.get('word/document.xml');
  if (!document) fail('The file does not contain a Word document.');
  xml(document); // Validate and reject entity declarations before ordered parsing.
  const ordered: Xml[]=new XMLParser({htmlEntities:true,preserveOrder:true,removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,trimValues:false}).parse(document.toString('utf8'));
  const children=(nodes: Xml[],tag:string): Xml[][] => nodes.filter(node=>tag in node).map(node=>node[tag]);
  function content(nodes:Xml[]):string {
    let result='';
    for(const node of nodes) for(const [tag,value] of Object.entries(node)) {
      if(tag===':@') continue;
      if(['drawing','pict','object','altChunk','instrText','fldSimple','ins','del','tbl','vMerge','gridSpan'].includes(tag)) fail('Remove embedded media, fields, tracked changes, nested tables and merged cells before importing. Upload media through the CMS.');
      if(tag==='#text') result+=String(value);
      else if(tag==='tab') result+='\t';
      else if(tag==='br') result+='\n';
      else if(Array.isArray(value)) result+=content(value)+(tag==='p'?'\n':'');
    }
    return result;
  }
  const body=children(children(ordered,'document')[0]||[],'body')[0];
  if(!body) fail('The Word document body is missing.');
  const tables=children(body,'tbl');
  if(tables.length>501) fail('Use at most 500 content tables.');
  const sheets:Record<string,Record<string,string>[]>={};
  const locations:Record<string,number>={};
  const rowTables:Record<string,number[]>={};
  const formatting:z.infer<typeof officeFormattingSchema>=[];
  let checkStyle=wordStyleGuard({});
  if(preserveJournalFormatting){try{checkStyle=wordStyleGuard(parts.has('word/styles.xml')?xml(parts.get('word/styles.xml')!).styles:{});}catch(error){fail(error instanceof Error?error.message:'Invalid Word styles.');}}
  function capture(name:string,record:Record<string,string>,cell:Xml[]|undefined,row:number,table:Xml[]){
    if(!preserveJournalFormatting||!(name==='ListItems'||name==='Blocks'&&record.kind==='paragraph')||!record.text||!cell)return;
    try{
      // Table styles can also supply inherited character formatting.
      const inspect=(nodes:Xml[])=>{for(const node of nodes)for(const [tag,value]of Object.entries(node)){if(tag==='tblStyle')checkStyle(String(node[':@']?.['@_val']??''));else if(tag==='tblPr'&&Array.isArray(value))inspect(value);}};
      inspect(table);const spans=wordInlineSpans(cell,record.text,checkStyle);if(spans)formatting.push({sheet:name as 'Blocks'|'ListItems',row,field:'text',spans});
    }catch(error){fail(`${name} row ${row}: ${error instanceof Error?error.message:'Invalid Word formatting.'}`);}
  }
  let templateVersion='',pageType='',totalRows=0;
  for(const [tableIndex,table] of tables.entries()) {
    const rawRows=children(table,'tr').map(row=>children(row,'tc'));
    const rows=rawRows.map(row=>row.map(cell=>content(cell).replace(/\n$/, '')));
    if(tableIndex===0) {
      rows.forEach(row=>row.forEach((value,i)=>row[i]=value.trim()));
      if(rows.length!==1 || rows[0].length!==3 || rows[0][0]!==marker) fail('The Word template metadata table is missing.');
      [,templateVersion,pageType]=rows[0]; continue;
    }
    const name=rows[0]?.[0]?.trim();
    const vertical=rows[0]?.length===2 && rows[0][1].trim()==='record' && rows[1]?.[0]?.trim()==='field' && rows[1]?.[1]?.trim()==='value';
    if(vertical){
      if(!sections.includes(name))fail('Unknown Word section table.');
      if(++totalRows>500)fail('An import supports at most 500 data rows.');
      const record:Record<string,string>={};
      for(const cells of rows.slice(2)){
        if(cells[0]!==undefined)cells[0]=cells[0].trim();
        if(cells.length!==2 || !cells[0] || ['__proto__','constructor','prototype'].includes(cells[0]) || Object.hasOwn(record,cells[0]))fail(`${name}: use unique field keys and one value cell per field.`);
        record[cells[0]]=cells[1];
      }
      capture(name,record,rawRows[rows.findIndex((cells,index)=>index>=2&&cells[0]==='text')]?.[1],(sheets[name]?.length??0)+2,table);
      (sheets[name]??=[]).push(record);locations[name]??=tableIndex+1;(rowTables[name]??=[]).push(tableIndex+1);
      continue;
    }
    if(rows[0]?.length!==1 || !sections.includes(name) || Object.hasOwn(sheets,name)) fail('Use the original, uniquely named Word section tables.');
    const keys=rows[1]?.map(value=>value.trim());
    if(!keys?.length || keys.length>32 || new Set(keys).size!==keys.length || keys.some(key=>!key || ['__proto__','constructor','prototype'].includes(key))) fail(`${name}: invalid table headings.`);
    sheets[name]=[]; locations[name]=tableIndex+1;rowTables[name]=[];
    for(const cells of rows.slice(2)) {
      if(++totalRows>500) fail('An import supports at most 500 data rows.');
      if(cells.length!==keys.length) fail(`${name}: each data row must match the heading columns.`);
      const record=Object.fromEntries(keys.map((key,index)=>[key,cells[index]]));
      capture(name,record,rawRows[sheets[name].length+2]?.[keys.indexOf('text')],sheets[name].length+2,table);
      sheets[name].push(record);
      rowTables[name].push(tableIndex+1);
    }
  }
  return {input:{templateVersion,pageType,sheets,...(formatting.length?{formatting}:{})},source:{format:'docx' as const,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,tables:locations,rowTables}};
}

export const parseJourneyXlsx=(bytes:Buffer)=>parseXlsx(bytes,journeySections);
export const parseJourneyDocx=(bytes:Buffer)=>parseDocx(bytes,journeySections,'CMSJourney');
/** Destination metadata is checked before handing parsed tables to the draft planner. */
export async function parseDestinationXlsx(bytes:Buffer){
 const result=await parseXlsx(bytes,destinationSections);
 if(result.input.pageType!=='destination'||result.input.templateVersion!==destinationTemplate.version)fail('Use the supported destination template.');
 return result;
}
export async function parseDestinationDocx(bytes:Buffer){
 const result=await parseDocx(bytes,destinationSections,'CMSDestination');
 if(result.input.pageType!=='destination'||result.input.templateVersion!==destinationTemplate.version)fail('Use the supported destination template.');
 return result;
}

/** Journal Office metadata must match before any draft planning. */
export async function parseJournalXlsx(bytes:Buffer){
 const result=await parseXlsx(bytes,Object.keys(journalTemplate.sheets),true);
 if(result.input.pageType!==journalTemplate.type||result.input.templateVersion!==journalTemplate.version)fail('Use the supported journal template.');
 return result;
}
export async function parseJournalDocx(bytes:Buffer){
 const result=await parseDocx(bytes,Object.keys(journalTemplate.sheets),'CMSJournal',true);
 if(result.input.pageType!==journalTemplate.type||result.input.templateVersion!==journalTemplate.version)fail('Use the supported journal template.');
 return result;
}

export async function parseExpeditionXlsx(bytes:Buffer){
 const result=await parseXlsx(bytes,Object.keys(expeditionTemplate.sheets));
 if(result.input.pageType!==expeditionTemplate.type||result.input.templateVersion!==expeditionTemplate.version)fail('Use the supported expedition template.');
 return result;
}
export async function parseExpeditionDocx(bytes:Buffer){
 const result=await parseDocx(bytes,Object.keys(expeditionTemplate.sheets),'CMSExpedition');
 if(result.input.pageType!==expeditionTemplate.type||result.input.templateVersion!==expeditionTemplate.version)fail('Use the supported expedition template.');
 return result;
}

/** Editorial page parsing shares the bounded archive/XML boundary. Planning and
 * explicit authenticated draft application remain separate operations. */
export async function parsePageXlsx(bytes:Buffer){
 const {pageImportTemplate}=await import('./page-import-contract.ts');
 const result=await parseXlsx(bytes,Object.keys(pageImportTemplate.sheets));
 if(result.input.pageType!==pageImportTemplate.type||result.input.templateVersion!==pageImportTemplate.version)fail('Use the supported editorial page template.');
 return result;
}
export async function parsePageDocx(bytes:Buffer){
 const {pageImportTemplate}=await import('./page-import-contract.ts');
 const result=await parseDocx(bytes,Object.keys(pageImportTemplate.sheets),'CMSPage');
 if(result.input.pageType!==pageImportTemplate.type||result.input.templateVersion!==pageImportTemplate.version)fail('Use the supported editorial page template.');
 return result;
}

/** Project files use a distinct marker and the same bounded Office decoder. */
export async function parseProjectXlsx(bytes:Buffer){
 const result=await parseXlsx(bytes,Object.keys(projectTemplate.sheets),true);
 if(result.input.pageType!==projectTemplate.type||result.input.templateVersion!==projectTemplate.version)fail('Use the supported project template.');
 return result;
}
export async function parseProjectDocx(bytes:Buffer){
 const result=await parseDocx(bytes,Object.keys(projectTemplate.sheets),'CMSProject',true);
 if(result.input.pageType!==projectTemplate.type||result.input.templateVersion!==projectTemplate.version)fail('Use the supported project template.');
 return result;
}

/** Reusable FAQ files have their own marker; no other family is guessed. */
export async function parseFaqXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(faqTemplate.sheets),true);if(result.input.pageType!==faqTemplate.type||result.input.templateVersion!==faqTemplate.version)fail('Use the supported FAQ template.');return result;}
export async function parseFaqDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(faqTemplate.sheets),'CMSFaq',true);if(result.input.pageType!==faqTemplate.type||result.input.templateVersion!==faqTemplate.version)fail('Use the supported FAQ template.');return result;}

/** News files use their explicit template identity. */
export async function parseNewsXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(newsTemplate.sheets),true);if(result.input.pageType!==newsTemplate.type||result.input.templateVersion!==newsTemplate.version)fail('Use the supported News template.');return result;}
export async function parseNewsDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(newsTemplate.sheets),'CMSNews',true);if(result.input.pageType!==newsTemplate.type||result.input.templateVersion!==newsTemplate.version)fail('Use the supported News template.');return result;}

/** Event files require their own versioned identity; parsing never writes drafts. */
export async function parseEventXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(eventTemplate.sheets),true);if(result.input.pageType!==eventTemplate.type||result.input.templateVersion!==eventTemplate.version)fail('Use the supported Event template.');return result;}
export async function parseEventDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(eventTemplate.sheets),'CMSEvent',true);if(result.input.pageType!==eventTemplate.type||result.input.templateVersion!==eventTemplate.version)fail('Use the supported Event template.');return result;}

export async function parseLeadershipXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(leadershipTemplate.sheets),true);if(result.input.pageType!==leadershipTemplate.type||result.input.templateVersion!==leadershipTemplate.version)fail('Use the supported Leadership template.');return result;}
export async function parseLeadershipDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(leadershipTemplate.sheets),'CMSLeadership',true);if(result.input.pageType!==leadershipTemplate.type||result.input.templateVersion!==leadershipTemplate.version)fail('Use the supported Leadership template.');return result;}

export async function parseApplicationXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(applicationTemplate.sheets),true);if(result.input.pageType!==applicationTemplate.type||result.input.templateVersion!==applicationTemplate.version)fail('Use the supported Application template.');return result;}
export async function parseApplicationDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(applicationTemplate.sheets),'CMSApplication',true);if(result.input.pageType!==applicationTemplate.type||result.input.templateVersion!==applicationTemplate.version)fail('Use the supported Application template.');return result;}
export async function parseLocationXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(locationTemplate.sheets),true);if(result.input.pageType!==locationTemplate.type||result.input.templateVersion!==locationTemplate.version)fail('Use the supported Location template.');return result;}
export async function parseLocationDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(locationTemplate.sheets),'CMSLocation',true);if(result.input.pageType!==locationTemplate.type||result.input.templateVersion!==locationTemplate.version)fail('Use the supported Location template.');return result;}

/** Career files require an explicit identity; parsing never saves or publishes. */
export async function parseCareerXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(careerTemplate.sheets),true);if(result.input.pageType!==careerTemplate.type||result.input.templateVersion!==careerTemplate.version)fail('Use the supported Career template.');return result;}
export async function parseCareerDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(careerTemplate.sheets),'CMSCareer',true);if(result.input.pageType!==careerTemplate.type||result.input.templateVersion!==careerTemplate.version)fail('Use the supported Career template.');return result;}

export async function parseCertificationXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(certificationTemplate.sheets));if(result.input.pageType!==certificationTemplate.type||result.input.templateVersion!==certificationTemplate.version)fail('Use the supported Certification template.');return result;}

export async function parseCertificationDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(certificationTemplate.sheets),'CMSCertification');if(result.input.pageType!==certificationTemplate.type||result.input.templateVersion!==certificationTemplate.version)fail('Use the supported Certification template.');return result;}

export async function parsePartnerXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(partnerTemplate.sheets),true);if(result.input.pageType!==partnerTemplate.type||result.input.templateVersion!==partnerTemplate.version)fail('Use the supported Partner template.');return result;}
export async function parsePartnerDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(partnerTemplate.sheets),'CMSPartner',true);if(result.input.pageType!==partnerTemplate.type||result.input.templateVersion!==partnerTemplate.version)fail('Use the supported Partner template.');return result;}

export async function parseProductCategoryXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(productCategoryTemplate.sheets));if(result.input.pageType!==productCategoryTemplate.type||result.input.templateVersion!==productCategoryTemplate.version)fail('Use the supported Product category template.');return result;}
export async function parseProductCategoryDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(productCategoryTemplate.sheets),'CMSProductCategory');if(result.input.pageType!==productCategoryTemplate.type||result.input.templateVersion!==productCategoryTemplate.version)fail('Use the supported Product category template.');return result;}

export async function parseProductXlsx(bytes:Buffer){const result=await parseXlsx(bytes,Object.keys(productTemplate.sheets),true);if(result.input.pageType!==productTemplate.type||result.input.templateVersion!==productTemplate.version)fail('Use the supported Product template.');return result;}
export async function parseProductDocx(bytes:Buffer){const result=await parseDocx(bytes,Object.keys(productTemplate.sheets),'CMSProduct',true);if(result.input.pageType!==productTemplate.type||result.input.templateVersion!==productTemplate.version)fail('Use the supported Product template.');return result;}
