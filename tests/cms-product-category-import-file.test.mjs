import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseProductCategoryXlsx,parseProductCategoryDocx} from '../lib/cms/import-file.ts';
import {planProductCategoryImport} from '../lib/cms/product-category-import-plan.ts';
const tables={Pages:[['recordId','operation','title','slug','locale'],['cat','create','Dimensions','dimensions','en']],Content:[['recordId','field','value'],['cat','summary','  Exact claim\nwith a line break  '],['cat','internalNotes','000123']],Groups:[['recordId','itemId','position','title'],['cat','physical','0','Physical properties']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','productCategory']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSProductCategory','1.0','productCategory'])}</w:tbl>${sections}</w:body></w:document>`};
}

test('Word and Excel preserve exact productCategory claim text, identifiers and dates',async()=>{
 const parsed=await Promise.all([parseProductCategoryXlsx(zip(xlsx())),parseProductCategoryDocx(zip(docx())),parseProductCategoryDocx(zip(docx(true)))]);
 const plans=parsed.map(v=>planProductCategoryImport(v.input));
 for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.summary,'  Exact claim\nwith a line break  ');assert.equal(plan.changes[0].payload.internalNotes,'000123');}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const item of parsed)assert.match(item.source.sha256,/^[a-f0-9]{64}$/);
});
test('productCategory files reject mismatched templates, formulas and tracked edits',async()=>{
 const excel=xlsx();excel['xl/worksheets/s0.xml']=excel['xl/worksheets/s0.xml'].replace('>1.0<','>9.0<');await assert.rejects(parseProductCategoryXlsx(zip(excel)),/Product category template/);
 const formula=xlsx();formula['xl/worksheets/s2.xml']=formula['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">000123</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseProductCategoryXlsx(zip(formula)),/formulas/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">000123</w:t>','<w:ins/>');await assert.rejects(parseProductCategoryDocx(zip(word)),/tracked changes/);
});


test('generated category Word and Excel templates preserve complete definitions and agree on filled drafts',async()=>{
 const plans=[];
 for(const [extension,parse]of [['docx',parseProductCategoryDocx],['xlsx',parseProductCategoryXlsx]]){
  const blank=await parse(await readFile(new URL(`../public/cms/templates/product-category-v1.${extension}`,import.meta.url)));const empty=planProductCategoryImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.changes,[]);
  const file=await parse(await readFile(new URL(`./fixtures/product-category-v1-filled.${extension}`,import.meta.url)));const plan=planProductCategoryImport(file.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));plans.push(plan.changes);
  const a=plan.changes[0].payload.attributeGroups[0].attributes[0];assert.deepEqual(a.allowedValues,['000123']);assert.equal(a.required,false);assert.equal(a.filterEligible,true);assert.deepEqual(a.regions,[{countryCode:'IN',region:'Gujarat'}]);
  file.input.sheets.Pages[0].title='x'.repeat(201);assert.equal(planProductCategoryImport(file.input).valid,false);
 }
 assert.deepEqual(plans[0],plans[1]);
});
