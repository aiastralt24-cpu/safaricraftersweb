import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {readFile} from 'node:fs/promises';
import {parseDestinationXlsx,parseDestinationDocx,parseJourneyXlsx} from '../lib/cms/import-file.ts';
import {planDestinationImport} from '../lib/cms/destination-import-plan.ts';
test('generated destination Word template ignores blank forms and imports a populated record',async()=>{
 const blank=await parseDestinationDocx(await readFile(new URL('../public/cms/templates/destination-v1.docx',import.meta.url)));
 const empty=planDestinationImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.issues.map(i=>i.code),['required']);
 const filled=await parseDestinationDocx(await readFile(new URL('./fixtures/destination-v1-filled.docx',import.meta.url)));
 const plan=planDestinationImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes.length,1);
 assert.equal(plan.changes[0].payload.slug,'word-forest');assert.equal(plan.changes[0].payload.intro,'Example introduction for parser verification only.');
 assert.deepEqual(filled.source.rowTables.Content,[3]);
});
test('generated destination Excel template is blank and its populated copy plans one draft',async()=>{
 const blank=await parseDestinationXlsx(await readFile(new URL('../public/cms/templates/destination-v1.xlsx',import.meta.url)));
 assert.ok(Object.values(blank.input.sheets).every(rows=>rows.length===0));
 assert.equal(planDestinationImport(blank.input).valid,false);
 const filled=await parseDestinationXlsx(await readFile(new URL('./fixtures/destination-v1-filled.xlsx',import.meta.url)));
 const plan=planDestinationImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes.length,1);
 assert.equal(plan.changes[0].payload.slug,'forest-example');assert.equal(plan.changes[0].payload.intro,'Example introduction for parser verification only.');
});
const tables={Pages:[['recordId','operation','slug','title','locale'],[],['forest','create','forest','Forest','en']],Content:[['recordId','field','value'],['forest','intro','Forest introduction']],FAQs:[['recordId','itemId','position','question','answer'],['forest','q1','1','When?','Winter']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','destination']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t>${escape(value)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSDestination','1.0','destination'])}</w:tbl>${Object.entries(tables).map(([name,rows])=>`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('')}</w:body></w:document>`};
}
test('destination Word and Excel files produce equivalent draft proposals with source provenance',async()=>{
 const excel=await parseDestinationXlsx(zip(xlsx())),word=await parseDestinationDocx(zip(docx()));
 for(const parsed of [excel,word]){const plan=planDestinationImport(parsed.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].payload.intro,'Forest introduction');assert.equal(parsed.source.sha256.length,64);}
 assert.deepEqual(planDestinationImport(excel.input).changes,planDestinationImport(word.input).changes);assert.deepEqual(word.source.rowTables.Pages,[2,2]);
});
test('blank Office rows retain subsequent destination diagnostic locations',async()=>{
 const parts=xlsx();parts['xl/worksheets/s1.xml']=parts['xl/worksheets/s1.xml'].replace('>forest<','>bad identity<');
 const plan=planDestinationImport((await parseDestinationXlsx(zip(parts))).input);assert.equal(plan.issues.find(i=>i.code==='identity').row,3);
});
test('destination parsers reject mismatched templates and unsupported sections',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>destination<','>journey<');await assert.rejects(parseDestinationXlsx(zip(parts)),/destination template/);
 await assert.rejects(parseJourneyXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSDestination','CMSJourney');await assert.rejects(parseDestinationDocx(zip(word)),/metadata/);
});
test('destination files inherit formula, external-link and tracked-change rejection',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t>Forest introduction</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseDestinationXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseDestinationXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t>Forest introduction</w:t>','<w:ins/>');await assert.rejects(parseDestinationDocx(zip(word)),/tracked changes/);
});
