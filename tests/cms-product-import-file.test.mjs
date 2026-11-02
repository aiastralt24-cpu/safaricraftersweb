import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseProductXlsx,parseProductDocx} from '../lib/cms/import-file.ts';
import {validateProductImportTables} from '../lib/cms/product-import-contract.ts';
const tables={Pages:[['recordId','operation','title','slug','locale'],['cat','create','Dimensions','dimensions','en']],Content:[['recordId','field','value'],['cat','summary','  Exact claim\nwith a line break  '],['cat','internalNotes','000123']],Specifications:[['recordId','itemId','position','attributeId','state','valueType','value'],['cat','finish','0','finish','known','choice','000123']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','product']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSProduct','1.0','product'])}</w:tbl>${sections}</w:body></w:document>`};
}

test('product Word, vertical Word and Excel preserve exact text and typed specification cells',async()=>{
 const parsed=await Promise.all([parseProductXlsx(zip(xlsx())),parseProductDocx(zip(docx())),parseProductDocx(zip(docx(true)))]);
 for(const result of parsed){const v=validateProductImportTables(result.input);assert.equal(v.valid,true,JSON.stringify(v.issues));assert.equal(v.tables.Specifications[0].value,'000123');assert.equal(v.tables.Content[0].value,'  Exact claim\nwith a line break  ');assert.match(result.source.sha256,/^[a-f0-9]{64}$/);}
 assert.deepEqual(parsed[0].input,parsed[1].input);assert.deepEqual(parsed[0].input,parsed[2].input);
});
test('product files reject mismatched templates, formulas and tracked edits',async()=>{
 const excel=xlsx();excel['xl/worksheets/s0.xml']=excel['xl/worksheets/s0.xml'].replace('>1.0<','>9.0<');await assert.rejects(parseProductXlsx(zip(excel)),/Product template/);
 const formula=xlsx();formula['xl/worksheets/s2.xml']=formula['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">000123</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseProductXlsx(zip(formula)),/formulas/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">000123</w:t>','<w:ins/>');await assert.rejects(parseProductDocx(zip(word)),/tracked changes/);
});
