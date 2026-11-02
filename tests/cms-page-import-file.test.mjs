import {planPageImport} from '../lib/cms/page-import-plan.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parsePageXlsx,parsePageDocx} from '../lib/cms/import-file.ts';
import {validatePageImportTables} from '../lib/cms/page-import-contract.ts';
const tables={Pages:[['recordId','operation','path','title','locale'],[],['guide','create','/field-guide','Guide','en']],Sections:[['recordId','sectionId','position','kind','label','headingLevel'],['guide','intro','1','text','Introduction','h1']],Blocks:[['recordId','sectionId','itemId','position','kind','text'],['guide','intro','paragraph','1','paragraph','  Exact text\nwith a line break  ']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','page']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSPage','1.0','page'])}</w:tbl>${sections}</w:body></w:document>`};
}

test('editorial Word and Excel parse bounded tables with whitespace and provenance intact',async()=>{
 const parsed=await Promise.all([parsePageXlsx(zip(xlsx())),parsePageDocx(zip(docx())),parsePageDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planPageImport(value.input));for(const plan of plans)assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);
 for(const value of parsed){const checked=validatePageImportTables(value.input);assert.equal(checked.valid,true,JSON.stringify(checked.issues));assert.equal(checked.tables.Blocks[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(checked.tables.Pages[0],{});assert.match(value.source.sha256,/^[a-f0-9]{64}$/);}
});
test('editorial import rejects wrong metadata and formulas before content planning',async()=>{
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSPage','CMSJourney');await assert.rejects(parsePageDocx(zip(word)),/metadata/);
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>page<','>journey<');await assert.rejects(parsePageXlsx(zip(parts)),/editorial page template/);
 const formula=xlsx();formula['xl/worksheets/s3.xml']=formula['xl/worksheets/s3.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parsePageXlsx(zip(formula)),/formulas/);
});
test('editorial cell validation retains row locations, enforces Unicode limits and distinguishes guidance',()=>{
 const input={templateVersion:'1.0',pageType:'page',sheets:{Pages:[{}, {recordId:'guide',operation:'create',path:'/guide',title:'Guide',locale:'en'}],SEO:[{recordId:'guide',field:'title',value:'a'.repeat(61)}]}};
 let checked=validatePageImportTables(input);assert.equal(checked.valid,true);assert.equal(checked.issues[0].severity,'warning');
 input.sheets.Pages[1].title='😀'.repeat(201);checked=validatePageImportTables(input);assert.equal(checked.valid,false);assert.ok(checked.issues.some(i=>i.sheet==='Pages'&&i.row===3&&i.field==='title'&&i.code==='character_limit'));
 input.sheets.Pages[1].title='Guide';input.sheets.Pages[1].secret='data';assert.equal(validatePageImportTables(input).valid,false);
 input.sheets.Pages[1].secret=undefined;assert.equal(validatePageImportTables(input).valid,false);
 const oversized={...input,sheets:{Pages:Array.from({length:501},()=>({}))}};assert.ok(validatePageImportTables(oversized).issues.some(i=>i.code==='row_limit'));
});

test('downloadable Excel page template stays blank and its filled example creates an exact draft',async()=>{
 const {readFile}=await import('node:fs/promises');
 const blank=await parsePageXlsx(await readFile(new URL('../public/cms/templates/page-v1.xlsx',import.meta.url)));
 assert.ok(Object.values(blank.input.sheets).every(rows=>rows.every(row=>Object.values(row).every(value=>value===''))));assert.equal(planPageImport(blank.input).valid,false);
 const filled=await parsePageXlsx(await readFile(new URL('./fixtures/page-v1-filled.xlsx',import.meta.url))),plan=planPageImport(filled.input);
 assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].path,'/field-guide');assert.equal(plan.changes[0].payload.composition.sections[0].data.body[0].text,'Original text\nSecond line');
});
test('page template cell limits match button labels, card links and section anchors',()=>{
 for(const [sheet,field,max] of [['Buttons','label',30],['Cards','label',30],['Sections','anchor',80]]){
  const row={recordId:'guide',sectionId:'intro',itemId:'entry',position:'1',kind:'text',label:'Entry',headingLevel:'h1',title:'Entry',href:'/contact'};
  const keys=sheet==='Buttons'?['recordId','sectionId','itemId','position','label','href']:sheet==='Cards'?['recordId','sectionId','itemId','position','title','label','href']:['recordId','sectionId','position','kind','label','headingLevel'];
  const value=Object.fromEntries(keys.map(key=>[key,row[key]]));value[field]='a'.repeat(max+1);
  const result=validatePageImportTables({templateVersion:'1.0',pageType:'page',sheets:{Pages:[{recordId:'guide',operation:'create',path:'/guide',title:'Guide',locale:'en'}],[sheet]:[value]}});
  assert.ok(result.issues.some(issue=>issue.sheet===sheet&&issue.field===field&&issue.severity==='error'));
 }
});

test('downloadable Word page template is blank and matches the filled Excel draft exactly',async()=>{
 const {readFile}=await import('node:fs/promises');
 const blank=await parsePageDocx(await readFile(new URL('../public/cms/templates/page-v1.docx',import.meta.url)));
 assert.ok(Object.values(blank.input.sheets).every(rows=>rows.every(row=>Object.values(row).every(value=>value===''))));assert.equal(planPageImport(blank.input).valid,false);
 const word=planPageImport((await parsePageDocx(await readFile(new URL('./fixtures/page-v1-filled.docx',import.meta.url)))).input);
 const excel=planPageImport((await parsePageXlsx(await readFile(new URL('./fixtures/page-v1-filled.xlsx',import.meta.url)))).input);
 assert.equal(word.valid,true,JSON.stringify(word.issues));assert.deepEqual(word.changes,excel.changes);
});

test('Office numeric XML character references preserve newlines and literal entity-looking text',async()=>{
 const expected='Line one\nLine two 😀 literal &#10; & <end>';
 const parts=xlsx();parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace('  Exact text\nwith a line break  ','Line one&#10;Line two &#x1F600; literal &amp;#10; &amp; &lt;end&gt;');
 const plan=planPageImport((await parsePageXlsx(zip(parts))).input);assert.equal(plan.valid,true);assert.equal(plan.changes[0].payload.composition.sections[0].data.body[0].text,expected);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('  Exact text</w:t><w:br/><w:t xml:space="preserve">with a line break  ','Line one&#10;Line two &#x1F600; literal &amp;#10; &amp; &lt;end&gt;');
 const wordPlan=planPageImport((await parsePageDocx(zip(word))).input);assert.equal(wordPlan.valid,true);assert.equal(wordPlan.changes[0].payload.composition.sections[0].data.body[0].text,expected);
});
