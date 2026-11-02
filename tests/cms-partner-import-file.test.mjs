import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zip} from './office-fixtures.mjs';
import {parsePartnerXlsx,parsePartnerDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planPartnerImport} from '../lib/cms/partner-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale','kind'],[],['answer','create','Announcement','announcement','en','dealer']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['answer','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['answer','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['answer','first','1','list','First entry']]};
tables.Content=[['recordId','field','value'],['answer','summary','An industry summary.']];
tables.Services=[['recordId','itemId','position','text'],['answer','service','1','Repairs']];
tables.Coverage=[['recordId','itemId','position','countryCode'],['answer','india','1','IN']];
tables.Regions=[['recordId','itemId','position','coverageId','text'],['answer','gujarat','1','india','Gujarat']];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','partner']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSPartner','1.0','partner'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('partner Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parsePartnerXlsx(zip(xlsx())),parsePartnerDocx(zip(docx())),parsePartnerDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planPartnerImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.kind,'dealer');assert.deepEqual(plan.changes[0].payload.services,['Repairs']);assert.deepEqual(plan.changes[0].payload.coverage,[{countryCode:'IN',regions:['Gujarat']}]);assert.equal(plan.changes[0].path,'/partners/announcement');assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('partner Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>partner<','>destination<');await assert.rejects(parsePartnerXlsx(zip(parts)),/Partner template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSPartner','CMSJourney');await assert.rejects(parsePartnerDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parsePartnerDocx(zip(unknown)),/section tables/);
});
test('partner Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parsePartnerXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parsePartnerXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parsePartnerDocx(zip(word)),/tracked changes/);
});



test('downloadable partner templates and filled examples obey the same contract',async()=>{
 const changes=[];
 for(const [ext,parse] of [['xlsx',parsePartnerXlsx],['docx',parsePartnerDocx]]){
  const blank=planPartnerImport((await parse(await readFile(new URL(`../public/cms/templates/partner-v1.${ext}`,import.meta.url)))).input);assert.equal(blank.valid,false);assert.deepEqual(blank.changes,[]);assert.ok(blank.issues.some(i=>i.sheet==='Pages'&&i.code==='required'));
  const source=(await parse(await readFile(new URL(`./fixtures/partner-v1-filled.${ext}`,import.meta.url)))).input,plan=planPartnerImport(source);assert.equal(plan.valid,true,JSON.stringify(plan.issues));const d=plan.changes[0].payload;assert.equal(d.contact.phone,'0012345678');assert.deepEqual(d.services,['Repairs','Installation']);assert.deepEqual(d.coverage,[{countryCode:'IN',regions:['Gujarat']},{countryCode:'KE',regions:[]}]);assert.match(d.body[0].text,/only\.\nReplace/);changes.push(plan.changes);
  source.sheets.Pages.find(r=>r.recordId).title='x'.repeat(201);assert.equal(planPartnerImport(source).valid,false);
 }assert.deepEqual(changes[0],changes[1]);
});
