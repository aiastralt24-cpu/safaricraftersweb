import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zip} from './office-fixtures.mjs';
import {parseLeadershipXlsx,parseLeadershipDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planLeadershipImport} from '../lib/cms/leadership-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale'],[],['answer','create','Announcement','announcement','en']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['answer','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['answer','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['answer','first','1','list','First entry']]};
tables.Content=[['recordId','field','value'],['answer','role','Director'],['answer','sortOrder','9']];
tables.Links=[['recordId','itemId','position','label','href'],['answer','contact','1','Contact','/contact']];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','leadership']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSLeadership','1.0','leadership'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('leadership Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseLeadershipXlsx(zip(xlsx())),parseLeadershipDocx(zip(docx())),parseLeadershipDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planLeadershipImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.role,'Director');assert.equal(plan.changes[0].payload.sortOrder,9);assert.deepEqual(plan.changes[0].payload.links,[{label:'Contact',href:'/contact'}]);assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('leadership Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>leadership<','>destination<');await assert.rejects(parseLeadershipXlsx(zip(parts)),/Leadership template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSLeadership','CMSJourney');await assert.rejects(parseLeadershipDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseLeadershipDocx(zip(unknown)),/section tables/);
});
test('leadership Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseLeadershipXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseLeadershipXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseLeadershipDocx(zip(word)),/tracked changes/);
});

test('distributed leadership templates are empty and filled Word and Excel create equivalent drafts',async()=>{
 const plans=[];
 for(const [extension,parse]of [['xlsx',parseLeadershipXlsx],['docx',parseLeadershipDocx]]){
  const blank=await parse(await readFile(new URL(`../public/cms/templates/leadership-v1.${extension}`,import.meta.url)));
  const empty=planLeadershipImport(blank.input);
  assert.equal(empty.valid,false);assert.equal(empty.changes.length,0);
  assert.ok(empty.issues.some(issue=>issue.sheet==='Pages'&&issue.code==='required'));
  const filled=await parse(await readFile(new URL(`./fixtures/leadership-v1-filled.${extension}`,import.meta.url)));
  const plan=planLeadershipImport(filled.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));
  assert.equal(plan.changes.length,1);const profile=plan.changes[0].payload;
  assert.equal(profile.title,'Example leader');assert.equal(profile.role,'Example director');assert.equal(profile.sortOrder,9);
  assert.equal(profile.status,'current');assert.equal(profile.body[0].text,'This is sample content only.\nReplace it with an approved biography.');
  assert.deepEqual(profile.links,[{label:'Contact our team',href:'/contact'}]);plans.push(plan);
  const excessive=structuredClone(filled.input);excessive.sheets.Content.push({recordId:'leadership-example',field:'internalNotes',value:'x'.repeat(2001)});
  const rejected=planLeadershipImport(excessive);assert.equal(rejected.valid,false);assert.equal(rejected.changes.length,0);
  assert.ok(rejected.issues.some(issue=>issue.code==='character_limit'));
 }
 assert.deepEqual(plans[0].changes,plans[1].changes);
});

