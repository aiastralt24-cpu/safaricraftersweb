import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zip} from './office-fixtures.mjs';
import {parseCareerXlsx,parseCareerDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planCareerImport} from '../lib/cms/career-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale'],[],['answer','create','Announcement','announcement','en']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['answer','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['answer','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['answer','first','1','list','First entry']]};
tables.Content=[['recordId','field','value'],['answer','employment','fullTime'],['answer','workMode','remote'],['answer','opensAt','2026-11-01T09:00:00+05:30']];
tables.Application=[['recordId','mode','label','url','formId'],['answer','external','Apply','https://example.test/apply','']];
tables.Compensation=[['recordId','currency','minimum','maximum','unit'],['answer','INR','40000.50','60000','month']];
tables.RemoteRegions=[['recordId','itemId','position','region'],['answer','india','1','India']];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','career']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSCareer','1.0','career'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('career Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseCareerXlsx(zip(xlsx())),parseCareerDocx(zip(docx())),parseCareerDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planCareerImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.employment,'fullTime');assert.equal(plan.changes[0].payload.opensAt,'2026-11-01T09:00:00+05:30');assert.deepEqual(plan.changes[0].payload.application,{mode:'external',label:'Apply',url:'https://example.test/apply'});assert.deepEqual(plan.changes[0].payload.compensation,{currency:'INR',minimum:40000.5,maximum:60000,unit:'month'});assert.deepEqual(plan.changes[0].payload.remoteRegions,['India']);assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('career Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>career<','>destination<');await assert.rejects(parseCareerXlsx(zip(parts)),/Career template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSCareer','CMSJourney');await assert.rejects(parseCareerDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseCareerDocx(zip(unknown)),/section tables/);
});
test('career Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseCareerXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseCareerXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseCareerDocx(zip(word)),/tracked changes/);
});

test('career Office files reject unsupported versions and retain invalid content for review',async()=>{
 const excel=xlsx();excel['xl/worksheets/s0.xml']=excel['xl/worksheets/s0.xml'].replace('>1.0<','>9.0<');
 await assert.rejects(parseCareerXlsx(zip(excel)),/Career template/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('>1.0<','>9.0<');
 await assert.rejects(parseCareerDocx(zip(word)),/Career template/);
 for(const [parts,parse,path]of [[xlsx(),parseCareerXlsx,'xl/worksheets/s5.xml'],[docx(true),parseCareerDocx,'word/document.xml']]){
  // Application URLs are data, never fetched or silently repaired by parsing.
  parts[path]=parts[path].replace('https://example.test/apply','javascript:alert(1)');
  const parsed=await parse(zip(parts));
  assert.equal(parsed.input.sheets.Application[0].url,'javascript:alert(1)');
  const plan=planCareerImport(parsed.input);
  assert.equal(plan.valid,false);assert.deepEqual(plan.changes,[]);
 }
});

test('generated career Word template is blank and its filled example preserves job-specific content',async()=>{
 const blank=await parseCareerDocx(await readFile(new URL('../public/cms/templates/career-v1.docx',import.meta.url)));
 const empty=planCareerImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.changes,[]);
 assert.ok(empty.issues.some(issue=>issue.sheet==='Pages'&&issue.code==='required'));
 const filled=await parseCareerDocx(await readFile(new URL('./fixtures/career-v1-filled.docx',import.meta.url)));
 const plan=planCareerImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));
 assert.equal(plan.changes.length,1);const job=plan.changes[0].payload;
 assert.equal(job.title,'Example guest advisor');assert.equal(job.employment,'fullTime');
 assert.equal(job.opensAt,'2026-11-01T09:00:00+05:30');assert.deepEqual(job.remoteRegions,['India']);
 assert.deepEqual(job.compensation,{currency:'INR',minimum:40000.5,maximum:60000,unit:'month'});
 assert.deepEqual(job.application,{mode:'external',label:'Apply for this role',url:'https://example.test/apply'});
 assert.equal(job.body[0].text,'This is sample content only.\nReplace it with an approved job description.');
 assert.deepEqual(job.body[1].items,['Help guests choose appropriate journeys.']);
});

test('generated career Excel template is blank and matches the Word draft without numeric or date coercion',async()=>{
 const blank=await parseCareerXlsx(await readFile(new URL('../public/cms/templates/career-v1.xlsx',import.meta.url)));
 const empty=planCareerImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.changes,[]);
 assert.ok(empty.issues.some(issue=>issue.sheet==='Pages'&&issue.code==='required'));
 const excel=await parseCareerXlsx(await readFile(new URL('./fixtures/career-v1-filled.xlsx',import.meta.url)));
 const word=await parseCareerDocx(await readFile(new URL('./fixtures/career-v1-filled.docx',import.meta.url)));
 const proposed=planCareerImport(excel.input);assert.equal(proposed.valid,true,JSON.stringify(proposed.issues));
 assert.deepEqual(proposed.changes,planCareerImport(word.input).changes);
 assert.equal(excel.input.sheets.Compensation[0].minimum,'40000.50');
 assert.equal(excel.input.sheets.Content.find(row=>row.field==='postedOn').value,'2026-10-30');
 excel.input.sheets.Pages[0].title='x'.repeat(201);
 const excessive=planCareerImport(excel.input);assert.equal(excessive.valid,false);assert.deepEqual(excessive.changes,[]);
 assert.ok(excessive.issues.some(issue=>issue.field==='title'&&issue.code==='character_limit'));
});

