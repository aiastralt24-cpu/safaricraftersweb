import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseExpeditionXlsx,parseExpeditionDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planExpeditionImport} from '../lib/cms/photo-expedition-import-plan.ts';
const tables={Pages:[['recordId','operation','slug','title','locale'],[],['forest','create','forest','Forest','en']],Content:[['recordId','field','value'],['forest','price','INR 1,20,000 + tax'],['forest','intro','  Exact text\nwith a line break  ']],Departures:[['recordId','itemId','position','date','endDate','status','availability'],['forest','leap','1','2028-02-29','2028-03-03','Full','Waitlist']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','photoExpedition']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSExpedition','1.0','photoExpedition'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('expedition Word and Excel proposals preserve exact text, dates and source provenance',async()=>{
 const parsed=await Promise.all([parseExpeditionXlsx(zip(xlsx())),parseExpeditionDocx(zip(docx())),parseExpeditionDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planExpeditionImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.intro,'  Exact text\nwith a line break  ');assert.equal(plan.changes[0].payload.price,'INR 1,20,000 + tax');assert.equal(plan.changes[0].payload.departures[0].date,'2028-02-29');assert.equal(plan.changes[0].payload.departures[0].status,'Full');}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('expedition Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>photoExpedition<','>destination<');await assert.rejects(parseExpeditionXlsx(zip(parts)),/expedition template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSExpedition','CMSJourney');await assert.rejects(parseExpeditionDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>Departures<','>Unexpected<');await assert.rejects(parseExpeditionDocx(zip(unknown)),/section tables/);
});
test('expedition Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">price</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseExpeditionXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseExpeditionXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">price</w:t>','<w:ins/>');await assert.rejects(parseExpeditionDocx(zip(word)),/tracked changes/);
});
test('expedition Office blank rows preserve subsequent finding locations',async()=>{
 const parts=xlsx();parts['xl/worksheets/s1.xml']=parts['xl/worksheets/s1.xml'].replace('>forest<','>bad identity<');const plan=planExpeditionImport((await parseExpeditionXlsx(zip(parts))).input);assert.equal(plan.valid,false);assert.equal(plan.issues.find(i=>i.code==='identity').row,3);
});


test('downloadable expedition Excel template is blank and a filled copy preserves dates and multiline copy',async()=>{
 const {readFile}=await import('node:fs/promises');const {readOfficeArchive}=await import('../lib/cms/import-file.ts');
 const blankBytes=await readFile(new URL('../public/cms/templates/expedition-v1.xlsx',import.meta.url));const blank=await parseExpeditionXlsx(blankBytes);
 assert.ok(Object.values(blank.input.sheets).every(rows=>rows.length===0));assert.deepEqual(planExpeditionImport(blank.input).issues.map(issue=>issue.code),['required']);
 const archive=await readOfficeArchive(blankBytes),pages=archive.get('xl/worksheets/sheet2.xml').toString();assert.match(pages,/dataValidation/);assert.match(pages,/create,update/);assert.match(pages,/LEN\(E2\)&gt;200|LEN\(E2\)>200/);assert.match(pages,/state="frozen"/);
 const filled=await parseExpeditionXlsx(await readFile(new URL('./fixtures/expedition-v1-filled.xlsx',import.meta.url))),result=planExpeditionImport(filled.input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes[0].payload.intro,'Original text\nSecond line');assert.equal(result.changes[0].payload.departures[0].date,'2028-02-29');assert.equal(result.changes[0].payload.departures[0].status,'Full');
});
test('downloadable expedition Word template has blank value fields and a filled copy imports exact copy and dates',async()=>{
 const {readFile}=await import('node:fs/promises');const blank=await parseExpeditionDocx(await readFile(new URL('../public/cms/templates/expedition-v1.docx',import.meta.url)));
 assert.deepEqual(planExpeditionImport(blank.input).issues.map(issue=>issue.code),['required']);assert.ok(Object.values(blank.input.sheets).every(rows=>rows.every(row=>Object.values(row).every(value=>value===''))));
 const filled=await parseExpeditionDocx(await readFile(new URL('./fixtures/expedition-v1-filled.docx',import.meta.url))),result=planExpeditionImport(filled.input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes[0].payload.intro,'Original paragraph with a line break.\nSecond line remains intact.');assert.equal(result.changes[0].payload.departures[0].date,'2028-02-29');assert.equal(result.changes[0].payload.departures[0].status,'Full');
});
