import {zip,wordFixture} from './office-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseJourneyXlsx,parseJourneyDocx,readOfficeArchive,FILE_LIMITS} from '../lib/cms/import-file.ts';
import {planJourneyImport} from '../lib/cms/import-contract.ts';

// Minimal stored ZIP fixtures exercise the actual OOXML parser, not mocked XML calls.
const cell=(ref,text)=>`<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
function fixture(){return {
  '[Content_Types].xml':'<Types/>',
  'xl/workbook.xml':'<workbook xmlns:r="urn:r"><sheets><sheet name="Instructions" r:id="r1"/><sheet name="Pages" r:id="r2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Type="urn:test/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Type="urn:test/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<worksheet><sheetData><row r="1">${cell('A1','templateVersion')}${cell('B1','1.0')}</row><row r="2">${cell('A2','pageType')}${cell('B2','journey')}</row></sheetData></worksheet>`,
  'xl/worksheets/sheet2.xml':`<worksheet><sheetData><row r="1">${cell('A1','recordId')}${cell('B1','operation')}${cell('C1','expectedRevision')}${cell('D1','title')}</row><row r="4">${cell('A4','journey-01')}${cell('B4','update')}${cell('C4','r2')}${cell('D4','A new original title for the journey')}</row></sheetData></worksheet>`
};}
const existing=[{id:'journey-01',revision:'r2',slug:'forest'}];
test('downloadable blank template contains no accidental example pages or counted formatted rows',async()=>{
 const parsed=await parseJourneyXlsx(await readFile(new URL('../public/cms/templates/journey-v1.xlsx',import.meta.url)));
 assert.equal(parsed.input.templateVersion,'1.0');assert.ok(Object.values(parsed.input.sheets).every(rows=>rows.length===0));
 const plan=planJourneyImport(parsed.input);assert.deepEqual(plan.issues.map(issue=>issue.code),['empty']);
});
test('populated artifact-tool workbook passes the real import parser and contract',async()=>{
 const parsed=await parseJourneyXlsx(await readFile(new URL('./fixtures/journey-v1-filled.xlsx',import.meta.url)));
 const plan=planJourneyImport(parsed.input);assert.equal(plan.valid,true);assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].recordId,'journey-example');assert.equal(plan.changes[0].fields.buttonLabel,'Plan this journey');
});
test('distributed vertical Word template is empty and its populated fixture creates one draft',async()=>{
 const blank=await parseJourneyDocx(await readFile(new URL('../public/cms/templates/journey-v1.docx',import.meta.url)));assert.deepEqual(planJourneyImport(blank.input).issues.map(i=>i.code),['empty']);
 const filled=await parseJourneyDocx(await readFile(new URL('./fixtures/journey-v1-filled.docx',import.meta.url)));const plan=planJourneyImport(filled.input);assert.equal(plan.valid,true);assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].recordId,'journey-word-example');assert.deepEqual(filled.source.rowTables.Pages,[2]);
});
test('Word vertical tables can repeat for child records while preserving table locations',async()=>{
 const row=(a,b)=>`<w:tr><w:tc><w:p><w:r><w:t>${a}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${b}</w:t></w:r></w:p></w:tc></w:tr>`;
 const table=id=>`<w:tbl>${row('Itinerary','record')}${row('field','value')}${row('recordId','journey-01')}${row('itemId',id)}</w:tbl>`;
 const parts=wordFixture();parts['word/document.xml']=parts['word/document.xml'].replace('</w:body>',`${table('day-1')}${table('day-2')}</w:body>`);
 const parsed=await parseJourneyDocx(zip(parts));assert.deepEqual(parsed.input.sheets.Itinerary.map(r=>r.itemId),['day-1','day-2']);assert.deepEqual(parsed.source.rowTables.Itinerary,[3,4]);
});
test('parses a workbook to a validated draft change and records source digest',async()=>{const data=zip(fixture());const parsed=await parseJourneyXlsx(data);assert.equal(parsed.source.sha256.length,64);assert.equal(parsed.source.bytes,data.length);const plan=planJourneyImport(parsed.input,existing);assert.equal(plan.valid,true);assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].fields.title,'A new original title for the journey');});
test('blank and malformed rows do not shift later diagnostic locations',async()=>{const parsed=await parseJourneyXlsx(zip(fixture()));const plan=planJourneyImport(parsed.input,[{...existing[0],revision:'r3'}]);assert.equal(plan.issues.find(i=>i.code==='revision_conflict').row,4);parsed.input.sheets.Pages[0]=null;const malformed=planJourneyImport(parsed.input,[{...existing[0],revision:'r3'}]);assert.equal(malformed.issues.find(i=>i.code==='revision_conflict').row,4);});
test('rejects formulas even when cached display text looks harmless',async()=>{const parts=fixture();parts['xl/worksheets/sheet2.xml']=parts['xl/worksheets/sheet2.xml'].replace(cell('D4','A new original title for the journey'),'<c r="D4"><f>1+1</f><v>2</v></c>');await assert.rejects(parseJourneyXlsx(zip(parts)),/formulas/);});
test('rejects external links and macros',async()=>{for(const key of ['xl/externalLinks/link1.xml','xl/vbaProject.bin']){const parts=fixture();parts[key]='payload';await assert.rejects(parseJourneyXlsx(zip(parts)),/Macros/);}const parts=fixture();parts['xl/_rels/workbook.xml.rels']=parts['xl/_rels/workbook.xml.rels'].replace('Id="r1"','Id="r1" TargetMode="External"');await assert.rejects(parseJourneyXlsx(zip(parts)),/External/);});
test('rejects entity declarations, malformed XML and oversized files',async()=>{for(const xml of ['<!DOCTYPE worksheet [<!ENTITY x "danger">]><worksheet/>','<worksheet>']){const parts=fixture();parts['xl/worksheets/sheet2.xml']=xml;await assert.rejects(parseJourneyXlsx(zip(parts)),/XML/);}await assert.rejects(readOfficeArchive(Buffer.alloc(FILE_LIMITS.bytes+1)),/5 MB/);await assert.rejects(readOfficeArchive(Buffer.from('not zip')),/readable/);});
test('rejects sparse row amplification and ambiguous duplicate headings',async()=>{const parts=fixture();parts['xl/worksheets/sheet2.xml']=parts['xl/worksheets/sheet2.xml'].replace('r="4"','r="1000000"');await assert.rejects(parseJourneyXlsx(zip(parts)),/row number/);const duplicate=fixture();duplicate['xl/worksheets/sheet2.xml']=duplicate['xl/worksheets/sheet2.xml'].replace('>title<','>recordId<');await assert.rejects(parseJourneyXlsx(zip(duplicate)),/headings/);});
test('numeric date serials cannot become editorial text',async()=>{const parts=fixture();parts['xl/worksheets/sheet2.xml']=parts['xl/worksheets/sheet2.xml'].replace(cell('D4','A new original title for the journey'),'<c r="D4" s="2"><v>45000</v></c>');await assert.rejects(parseJourneyXlsx(zip(parts)),/store content as text/);});
test('Word tables feed the same revision-aware import contract',async()=>{const parsed=await parseJourneyDocx(zip(wordFixture()));assert.equal(parsed.source.tables.Pages,2);assert.equal(parsed.source.format,'docx');const plan=planJourneyImport(parsed.input,existing);assert.equal(plan.valid,true);assert.equal(plan.changes[0].fields.title,'A private journey through the forests');});
test('Word run order and paragraph breaks are preserved',async()=>{const parts=wordFixture();parts['word/document.xml']=parts['word/document.xml'].replace('<w:t>A private journey through the forests</w:t>','<w:t>A private </w:t></w:r><w:r><w:t>journey</w:t></w:r></w:p><w:p><w:r><w:t>through the forests</w:t>');const parsed=await parseJourneyDocx(zip(parts));assert.equal(parsed.input.sheets.Pages[0].title,'A private journey\nthrough the forests');});
test('Word embedded content and missing structure are rejected',async()=>{for(const payload of ['<w:drawing/>','<w:instrText>INCLUDETEXT</w:instrText>','<w:ins/>','<w:gridSpan/>']){const parts=wordFixture();parts['word/document.xml']=parts['word/document.xml'].replace('<w:t>r2</w:t>',payload);await assert.rejects(parseJourneyDocx(zip(parts)),/embedded media/);}const parts=wordFixture();parts['word/document.xml']=parts['word/document.xml'].replace('CMSJourney','Other');await assert.rejects(parseJourneyDocx(zip(parts)),/metadata/);});
