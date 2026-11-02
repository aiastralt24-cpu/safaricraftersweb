import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseCertificationXlsx,parseCertificationDocx} from '../lib/cms/import-file.ts';
import {planCertificationImport} from '../lib/cms/certification-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale'],['cert','create','Quality','quality','en']],Content:[['recordId','field','value'],['cert','statement','  Exact claim\nwith a line break  '],['cert','issuedOn','2026-01-01'],['cert','certificateNumber','000123']],Evidence:[['recordId','itemId','position','targetId'],['cert','proof','1','00000000-0000-4000-8000-000000000005']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','certification']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSCertification','1.0','certification'])}</w:tbl>${sections}</w:body></w:document>`};
}

test('Word and Excel preserve exact certification claim text, identifiers and dates',async()=>{
 const parsed=await Promise.all([parseCertificationXlsx(zip(xlsx())),parseCertificationDocx(zip(docx())),parseCertificationDocx(zip(docx(true)))]);
 const plans=parsed.map(v=>planCertificationImport(v.input));
 for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.statement,'  Exact claim\nwith a line break  ');assert.equal(plan.changes[0].payload.certificateNumber,'000123');assert.equal(plan.changes[0].payload.issuedOn,'2026-01-01');}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const item of parsed)assert.match(item.source.sha256,/^[a-f0-9]{64}$/);
});
test('certification files reject mismatched templates, formulas and tracked edits',async()=>{
 const excel=xlsx();excel['xl/worksheets/s0.xml']=excel['xl/worksheets/s0.xml'].replace('>1.0<','>9.0<');await assert.rejects(parseCertificationXlsx(zip(excel)),/Certification template/);
 const formula=xlsx();formula['xl/worksheets/s2.xml']=formula['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">000123</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseCertificationXlsx(zip(formula)),/formulas/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">000123</w:t>','<w:ins/>');await assert.rejects(parseCertificationDocx(zip(word)),/tracked changes/);
});

test('downloadable blank templates require content and filled Word/Excel examples yield identical drafts',async()=>{
 const plans=[];
 for(const [extension,parse]of [['docx',parseCertificationDocx],['xlsx',parseCertificationXlsx]]){
  const blank=await parse(await readFile(new URL(`../public/cms/templates/certification-v1.${extension}`,import.meta.url)));
  const empty=planCertificationImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.changes,[]);assert.ok(empty.issues.some(i=>i.sheet==='Pages'&&i.code==='required'));
  const filled=await parse(await readFile(new URL(`./fixtures/certification-v1-filled.${extension}`,import.meta.url)));
  const plan=planCertificationImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));plans.push(plan);
  assert.equal(plan.changes[0].payload.certificateNumber,'000123');assert.equal(plan.changes[0].payload.issuedOn,'2026-10-30');assert.equal(plan.changes[0].payload.statement,'Example claim only.\nReplace with the exact approved wording.');
  filled.input.sheets.Pages[0].title='x'.repeat(201);const invalid=planCertificationImport(filled.input);assert.equal(invalid.valid,false);assert.deepEqual(invalid.changes,[]);
 }
 assert.deepEqual(plans[0].changes,plans[1].changes);
});
