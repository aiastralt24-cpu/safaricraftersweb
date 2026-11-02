import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zip} from './office-fixtures.mjs';
import {parseLocationXlsx,parseLocationDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planLocationImport} from '../lib/cms/location-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale','kind'],[],['answer','create','Announcement','announcement','en','office']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['answer','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['answer','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['answer','first','1','list','First entry']]};
tables.Content=[['recordId','field','value'],['answer','summary','An industry summary.']];
tables.AddressLines=[['recordId','itemId','position','text'],['answer','street','1','12 Main Street']];
tables.Hours=[['recordId','itemId','position','day','closed','opens','closes'],['answer','monday','1','1','false','09:00','17:00']];
tables.Coordinates=[['recordId','latitude','longitude'],['answer','0','12.5']];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','location']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSLocation','1.0','location'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('location Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseLocationXlsx(zip(xlsx())),parseLocationDocx(zip(docx())),parseLocationDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planLocationImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.kind,'office');assert.deepEqual(plan.changes[0].payload.coordinates,{latitude:0,longitude:12.5});assert.deepEqual(plan.changes[0].payload.address.lines,['12 Main Street']);assert.equal(plan.changes[0].payload.hours[0].intervals[0].opens,'09:00');assert.equal(plan.changes[0].path,'/locations/announcement');assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('location Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>location<','>destination<');await assert.rejects(parseLocationXlsx(zip(parts)),/Location template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSLocation','CMSJourney');await assert.rejects(parseLocationDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseLocationDocx(zip(unknown)),/section tables/);
});
test('location Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseLocationXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseLocationXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseLocationDocx(zip(word)),/tracked changes/);
});


test('downloadable blank location templates and filled Word/Excel examples share one contract',async()=>{
 const plans=[];
 for(const [ext,parse]of [['xlsx',parseLocationXlsx],['docx',parseLocationDocx]]){
  const blank=planLocationImport((await parse(await readFile(new URL(`../public/cms/templates/location-v1.${ext}`,import.meta.url)))).input);assert.equal(blank.valid,false);assert.deepEqual(blank.changes,[]);assert.ok(blank.issues.some(i=>i.sheet==='Pages'&&i.code==='required'));
  const source=(await parse(await readFile(new URL(`./fixtures/location-v1-filled.${ext}`,import.meta.url)))).input,result=planLocationImport(source);assert.equal(result.valid,true,JSON.stringify(result.issues));const draft=result.changes[0].payload;assert.equal(draft.address.postalCode,'00123');assert.deepEqual(draft.address.lines,['12 Example Street']);assert.equal(draft.coordinates.latitude,0);assert.deepEqual(draft.hours,[{day:1,intervals:[{opens:'09:00',closes:'17:00'}]},{day:7,intervals:[]}]);assert.equal(draft.visiting,'appointmentOnly');plans.push(result.changes);
  source.sheets.Pages.find(r=>r.recordId).title='x'.repeat(201);assert.equal(planLocationImport(source).valid,false);
 }assert.deepEqual(plans[0],plans[1]);
});
