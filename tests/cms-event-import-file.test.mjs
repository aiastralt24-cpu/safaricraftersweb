import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseEventXlsx,parseEventDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planEventImport} from '../lib/cms/event-import-plan.ts';
const tables={Content:[['recordId','field','value'],['answer','timing.mode','allDay'],['answer','timing.start','2028-02-29'],['answer','timing.end','2028-02-29'],['answer','registration.enabled','false']],Pages:[['recordId','operation','title','slug','locale'],[],['answer','create','Announcement','announcement','en']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['answer','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['answer','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['answer','first','1','list','First entry']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','event']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSEvent','1.0','event'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('event Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseEventXlsx(zip(xlsx())),parseEventDocx(zip(docx())),parseEventDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planEventImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);assert.deepEqual(plan.changes[0].payload.timing,{mode:'allDay',start:'2028-02-29',end:'2028-02-29'});assert.equal(plan.changes[0].payload.registration.enabled,false);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[3,3]);
});
test('event Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>event<','>destination<');await assert.rejects(parseEventXlsx(zip(parts)),/Event template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSEvent','CMSJourney');await assert.rejects(parseEventDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseEventDocx(zip(unknown)),/section tables/);
});
test('event Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseEventXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseEventXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseEventDocx(zip(word)),/tracked changes/);
});


test('distributed Event templates produce equivalent drafts and enforce field limits',async()=>{
 const {readFile}=await import('node:fs/promises');const plans=[];
 for(const [extension,parse]of [['xlsx',parseEventXlsx],['docx',parseEventDocx]]){
  const blank=await parse(await readFile(new URL('../public/cms/templates/event-v1.'+extension,import.meta.url)));
  assert.equal(planEventImport(blank.input).valid,false);
  const filled=await parse(await readFile(new URL('./fixtures/event-v1-filled.'+extension,import.meta.url)));
  const plan=planEventImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));plans.push(plan);
  filled.input.sheets.Pages[0].title='x'.repeat(201);
  const invalid=planEventImport(filled.input);assert.equal(invalid.valid,false);assert.equal(invalid.changes.length,0);
 }
 assert.deepEqual(plans[0].changes,plans[1].changes);
 const content=plans[0].changes[0].payload;
 assert.equal(content.attendance,'online');assert.deepEqual(content.timing,{mode:'allDay',start:'2026-12-01',end:'2026-12-01'});assert.equal(content.registration.enabled,false);
 assert.equal(content.body[0].text,'This is sample content only.\nReplace it with an approved update.');
 assert.equal(content.body[1].level,'h2');assert.deepEqual(content.body[2].items,['Review every proposed change before saving.']);
});
