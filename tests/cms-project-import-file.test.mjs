import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zip} from './office-fixtures.mjs';
import {parseProjectXlsx,parseProjectDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planProjectImport} from '../lib/cms/project-import-plan.ts';
const tables={Pages:[['recordId','operation','slug','title','locale'],[],['forest','create','forest','Forest','en']],Blocks:[['recordId','itemId','position','section','kind','text','ordered'],['forest','paragraph','1','body','paragraph','  Exact text\nwith a line break  ',''],['forest','list','2','body','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['forest','first','1','list','First entry']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
test('distributed project Office templates parse and filled examples produce equivalent drafts',async()=>{
 const plans=[];
 for(const [extension,parse] of [['xlsx',parseProjectXlsx],['docx',parseProjectDocx]]){
  const blank=await parse(await readFile(new URL(`../public/cms/templates/project-v1.${extension}`,import.meta.url)));
  assert.equal(blank.input.pageType,'project');
  assert.equal(planProjectImport(blank.input).valid,false,'Blank forms must not create drafts');
  const filled=await parse(await readFile(new URL(`./fixtures/project-v1-filled.${extension}`,import.meta.url)));
  const plan=planProjectImport(filled.input);
  assert.equal(plan.valid,true,JSON.stringify(plan.issues));
  assert.equal(plan.changes.length,1);
  for(const section of ['body','challenge','approach','outcomes'])assert.equal(plan.changes[0].payload[section][0].text,`Example ${section} text.\nSecond line remains intact.`);
  assert.equal(plan.changes[0].payload.claims.length,1);
  plans.push(plan);
 }
 assert.deepEqual(plans[0].changes,plans[1].changes);
});
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','project']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSProject','1.0','project'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('project Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseProjectXlsx(zip(xlsx())),parseProjectDocx(zip(docx())),parseProjectDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planProjectImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('project Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>project<','>destination<');await assert.rejects(parseProjectXlsx(zip(parts)),/project template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSProject','CMSJourney');await assert.rejects(parseProjectDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseProjectDocx(zip(unknown)),/section tables/);
});
test('project Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseProjectXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseProjectXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseProjectDocx(zip(word)),/tracked changes/);
});
