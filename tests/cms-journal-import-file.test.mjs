import test from 'node:test';
import assert from 'node:assert/strict';
import {zip} from './office-fixtures.mjs';
import {parseJournalXlsx,parseJournalDocx,parseDestinationXlsx} from '../lib/cms/import-file.ts';
import {planJournalImport} from '../lib/cms/journal-import-plan.ts';
const tables={Pages:[['recordId','operation','slug','title','locale'],[],['forest','create','forest','Forest','en']],Blocks:[['recordId','itemId','position','kind','text','ordered'],['forest','paragraph','1','paragraph','  Exact text\nwith a line break  ',''],['forest','list','2','list','','false']],ListItems:[['recordId','itemId','position','blockId','text'],['forest','first','1','list','First entry']]};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function xlsx(){
 const all={Instructions:[['templateVersion','1.0'],['pageType','journalArticle']],...tables},parts={'[Content_Types].xml':'<Types/>'};
 parts['xl/workbook.xml']=`<workbook xmlns:r="urn:r"><sheets>${Object.keys(all).map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')}</sheets></workbook>`;
 parts['xl/_rels/workbook.xml.rels']=`<Relationships>${Object.keys(all).map((_,i)=>`<Relationship Id="r${i}" Type="urn:test/worksheet" Target="worksheets/s${i}.xml"/>`).join('')}</Relationships>`;
 Object.values(all).forEach((rows,i)=>{parts[`xl/worksheets/s${i}.xml`]=`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});return parts;
}
function docx(vertical=false){
 const row=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(value).replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
 const sections=Object.entries(tables).map(([name,rows])=>vertical?rows.slice(1).map(cells=>`<w:tbl>${row([name,'record'])}${row(['field','value'])}${rows[0].map((key,i)=>row([key,cells[i]??''])).join('')}</w:tbl>`).join(''):`<w:tbl>${row([name])}${rows.map(cells=>row(cells.length?cells:rows[0].map(()=>''))).join('')}</w:tbl>`).join('');
 return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSJournal','1.0','journalArticle'])}</w:tbl>${sections}</w:body></w:document>`};
}
test('journal Word and Excel proposals preserve paragraph whitespace, structure and provenance',async()=>{
 const parsed=await Promise.all([parseJournalXlsx(zip(xlsx())),parseJournalDocx(zip(docx())),parseJournalDocx(zip(docx(true)))]);
 const plans=parsed.map(value=>planJournalImport(value.input));for(const plan of plans){assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.body[0].text,'  Exact text\nwith a line break  ');assert.deepEqual(plan.changes[0].payload.body[1].items,['First entry']);}
 assert.deepEqual(plans[0].changes,plans[1].changes);assert.deepEqual(plans[0].changes,plans[2].changes);for(const value of parsed){assert.match(value.source.sha256,/^[a-f0-9]{64}$/);assert.ok(value.source.bytes>0);}assert.deepEqual(parsed[1].source.rowTables.Pages,[2,2]);
});
test('journal Office metadata and section mismatches are rejected before planning',async()=>{
 const parts=xlsx();parts['xl/worksheets/s0.xml']=parts['xl/worksheets/s0.xml'].replace('>journalArticle<','>destination<');await assert.rejects(parseJournalXlsx(zip(parts)),/journal template/);await assert.rejects(parseDestinationXlsx(zip(xlsx())),/template sheets/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('CMSJournal','CMSJourney');await assert.rejects(parseJournalDocx(zip(word)),/metadata/);
 const unknown=docx();unknown['word/document.xml']=unknown['word/document.xml'].replace('>ListItems<','>Unexpected<');await assert.rejects(parseJournalDocx(zip(unknown)),/section tables/);
});
test('journal Office parsers reject formula execution, external references and tracked edits',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<is><t xml:space="preserve">paragraph</t></is>','<f>1+1</f><v>2</v>');await assert.rejects(parseJournalXlsx(zip(parts)),/formulas/);
 const external=xlsx();external['xl/_rels/workbook.xml.rels']=external['xl/_rels/workbook.xml.rels'].replace('Id="r0"','Id="r0" TargetMode="External"');await assert.rejects(parseJournalXlsx(zip(external)),/External/);
 const word=docx();word['word/document.xml']=word['word/document.xml'].replace('<w:t xml:space="preserve">paragraph</w:t>','<w:ins/>');await assert.rejects(parseJournalDocx(zip(word)),/tracked changes/);
});
test('journal Office blank rows preserve subsequent finding locations',async()=>{
 const parts=xlsx();parts['xl/worksheets/s1.xml']=parts['xl/worksheets/s1.xml'].replace('>forest<','>bad identity<');const plan=planJournalImport((await parseJournalXlsx(zip(parts))).input);assert.equal(plan.valid,false);assert.equal(plan.issues.find(i=>i.code==='identity').row,3);
});

test('downloadable journal Word template stays blank and its filled copy imports the original paragraphs',async()=>{
 const {readFile}=await import('node:fs/promises');
 const blank=await parseJournalDocx(await readFile(new URL('../public/cms/templates/journal-v1.docx',import.meta.url)));const empty=planJournalImport(blank.input);assert.equal(empty.valid,false);assert.deepEqual(empty.issues.map(issue=>issue.code),['required']);
 const filled=await parseJournalDocx(await readFile(new URL('./fixtures/journal-v1-filled.docx',import.meta.url)));const result=planJournalImport(filled.input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes.length,1);assert.equal(result.changes[0].payload.slug,'word-forest');assert.equal(result.changes[0].payload.body[0].text,'Original paragraph with a line break.\nSecond line remains intact.');assert.deepEqual(filled.source.rowTables.Blocks,[4,5]);assertImportedTable(result);
});

test('downloadable journal Excel has empty content tables and its filled copy preserves multiline text',async()=>{
 const {readFile}=await import('node:fs/promises');
 const blank=await parseJournalXlsx(await readFile(new URL('../public/cms/templates/journal-v1.xlsx',import.meta.url)));assert.ok(Object.values(blank.input.sheets).every(rows=>rows.length===0));assert.equal(planJournalImport(blank.input).valid,false);
 const filled=await parseJournalXlsx(await readFile(new URL('./fixtures/journal-v1-filled.xlsx',import.meta.url)));const result=planJournalImport(filled.input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes.length,1);assert.equal(result.changes[0].payload.slug,'excel-forest');assert.equal(result.changes[0].payload.body[0].text,'Original text\nSecond line');
 assertImportedTable(result);
});
function assertImportedTable(result){assert.deepEqual(result.changes[0].payload.body[1],{id:'table-1',kind:'table',caption:'Season guide',headers:['Season','Notes'],rows:[['Summer','Early starts\nBring water'],['Winter','']]});}
test('native Excel rich runs preserve journal paragraph and list formatting through the import plan',async()=>{
 const parts=xlsx();parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace(/(<c r="E2"[^>]*>)[\s\S]*?(<\/c>)/,'$1<is><r><rPr><b/></rPr><t xml:space="preserve">  Exact text</t></r><r><rPr><i/></rPr><t xml:space="preserve">\nwith a line break  </t></r></is>$2');
 parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace(/(<c r="E2"[^>]*>)[\s\S]*?(<\/c>)/,'$1<is><r><t>First </t></r><r><rPr><vertAlign val="superscript"/></rPr><t>entry</t></r></is>$2');
 const parsed=await parseJournalXlsx(zip(parts)),plan=planJournalImport(parsed.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));const body=plan.changes[0].payload.body;
 assert.equal(body[0].text,'  Exact text\nwith a line break  ');assert.equal(body[0].spans[0].bold,true);assert.equal(body[0].spans[1].italic,true);assert.equal(body[1].itemSpans[0][1].script,'superscript');assert.equal(parsed.input.formatting.length,2);
});
test('Excel cell fonts and shared-string runs preserve direct formatting with explicit run overrides',async()=>{
 const parts=xlsx();parts['xl/styles.xml']='<styleSheet><fonts><font/><font><b/><i/></font></fonts><cellXfs><xf fontId="0"/><xf fontId="1"/></cellXfs></styleSheet>';
 parts['xl/sharedStrings.xml']='<sst><si><r><rPr><b val="0"/></rPr><t>First </t></r><r><rPr><vertAlign val="subscript"/></rPr><t>entry</t></r></si></sst>';
 parts['xl/worksheets/s2.xml']=parts['xl/worksheets/s2.xml'].replace('<c r="E2" t="inlineStr">','<c r="E2" s="1" t="inlineStr">');
 parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace(/<c r="E2"[^>]*>.*?<\/c>/,'<c r="E2" s="1" t="s"><v>0</v></c>');
 const plan=planJournalImport((await parseJournalXlsx(zip(parts))).input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes[0].payload.body[0].spans[0].bold,true);const runs=plan.changes[0].payload.body[1].itemSpans[0];assert.equal(runs[0].bold,false);assert.equal(runs[0].italic,true);assert.equal(runs[1].script,'subscript');
});
test('unsupported journal Excel marks and invalid style references fail without silently flattening content',async()=>{
 for(const properties of ['<u/>','<strike/>','<vertAlign val="unsupported"/>']){const parts=xlsx();parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace('<is><t xml:space="preserve">First entry</t></is>',`<is><r><rPr>${properties}</rPr><t>First entry</t></r></is>`);await assert.rejects(parseJournalXlsx(zip(parts)),/supported|position/);}
 const parts=xlsx();parts['xl/worksheets/s3.xml']=parts['xl/worksheets/s3.xml'].replace('<c r="E2" t="inlineStr">','<c r="E2" s="999" t="inlineStr">');await assert.rejects(parseJournalXlsx(zip(parts)),/style reference/);
});
test('Office formatting cannot target another cell, mismatch its text or add unsafe links',async()=>{
 const plain=(await parseJournalXlsx(zip(xlsx()))).input,cell={sheet:'ListItems',row:2,field:'text',spans:[{text:'First entry',bold:true}]};
 assert.equal(planJournalImport({...plain,formatting:[cell]}).valid,true);
 for(const formatting of [[cell,cell],[{...cell,row:3}],[{...cell,field:'recordId'}],[{...cell,spans:[{text:'Different'}]}],[{...cell,spans:[{text:'First entry',href:'javascript:alert(1)'}]}]]){const result=planJournalImport({...plain,formatting});assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
});
test('default and inherited Excel cell fonts are resolved before direct run overrides',async()=>{
 const parts=xlsx();parts['xl/styles.xml']='<styleSheet><fonts><font/><font><b/></font></fonts><cellStyleXfs><xf fontId="1"/></cellStyleXfs><cellXfs><xf fontId="0" xfId="0" applyFont="0"/></cellXfs></styleSheet>';
 const plan=planJournalImport((await parseJournalXlsx(zip(parts))).input);assert.equal(plan.valid,true);assert.equal(plan.changes[0].payload.body[0].spans[0].bold,true);assert.equal(plan.changes[0].payload.body[1].itemSpans[0][0].bold,true);
});
test('authenticated file review retains native Excel formatting and binds it into the review digest',async()=>{
 const {handleJournalImportUpload}=await import('../lib/cms/journal-import-api.ts');const site='00000000-0000-4000-8000-000000000001',parts=xlsx();parts['xl/styles.xml']='<styleSheet><fonts><font><b/></font></fonts><cellXfs><xf fontId="0"/></cellXfs></styleSheet>';
 const review=async parts=>{const bytes=zip(parts);return handleJournalImportUpload(new Request('https://cms.test/api/cms/journal-import',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/octet-stream','x-cms-site':site,'x-cms-format':'xlsx','x-cms-action':'review'},body:bytes}),async(_token,name)=>{if(name==='list_editor_sites')return [{id:site}];if(name==='review_journal_import_links')return [];throw Error(name);});};
 const response=await review(parts);assert.equal(response.status,200);const formatted=await response.json();assert.equal(formatted.applyAvailable,true);assert.equal(formatted.plan.changes[0].payload.body[0].spans[0].bold,true);const plain=await(await review(xlsx())).json();assert.notEqual(formatted.reviewDigest,plain.reviewDigest);
});

test('Word direct journal formatting survives both table layouts with exact text',async()=>{
 for(const vertical of [false,true]){
  const parts=docx(vertical);parts['word/document.xml']=parts['word/document.xml'].replace('<w:t xml:space="preserve">  Exact text','<w:rPr><w:b/><w:i/></w:rPr><w:t xml:space="preserve">  Exact text').replace('<w:t xml:space="preserve">First entry</w:t>','<w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t xml:space="preserve">First entry</w:t>');
  const parsed=await parseJournalDocx(zip(parts)),plan=planJournalImport(parsed.input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));const body=plan.changes[0].payload.body;
  assert.equal(body[0].spans[0].bold,true);assert.equal(body[0].spans[0].italic,true);assert.equal(body[0].spans.map(s=>s.text).join(''),body[0].text);assert.equal(body[1].itemSpans[0][0].script,'subscript');assert.deepEqual(parsed.input.formatting.map(c=>[c.sheet,c.row]),[['Blocks',2],['ListItems',2]]);
 }
});
test('Word mixed runs, explicit false and paragraph boundaries preserve exact content',async()=>{
 const parts=docx();parts['word/document.xml']=parts['word/document.xml'].replace('<w:t xml:space="preserve">First entry</w:t>','<w:rPr><w:b/></w:rPr><w:t>First </w:t></w:r><w:r><w:rPr><w:b w:val="0"/><w:vertAlign w:val="superscript"/></w:rPr><w:t>entry</w:t>');
 const plan=planJournalImport((await parseJournalDocx(zip(parts))).input);assert.equal(plan.valid,true);assert.deepEqual(plan.changes[0].payload.body[1].itemSpans[0],[{text:'First ',bold:true},{text:'entry',bold:false,script:'superscript'}]);
});
test('Word unsupported direct or inherited formatting is rejected before planning',async()=>{
 for(const prop of ['<w:u/>','<w:strike/>','<w:vanish/>','<w:vertAlign w:val="bad"/>','<w:rStyle w:val="Missing"/>']){
  const parts=docx();parts['word/document.xml']=parts['word/document.xml'].replace('<w:t xml:space="preserve">First entry</w:t>',`<w:rPr>${prop}</w:rPr><w:t>First entry</w:t>`);await assert.rejects(parseJournalDocx(zip(parts)),/Unsupported|unsupported|Unknown|not supported/);
 }
 const parts=docx();parts['word/styles.xml']='<w:styles xmlns:w="urn:w"><w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:rPr><w:u/></w:rPr></w:style></w:styles>';await assert.rejects(parseJournalDocx(zip(parts)),/inherited editorial/);
});
test('authenticated Word review binds preserved formatting into the draft proposal',async()=>{
 const {handleJournalImportUpload}=await import('../lib/cms/journal-import-api.ts');const site='00000000-0000-4000-8000-000000000001',parts=docx(true);parts['word/document.xml']=parts['word/document.xml'].replace('<w:t xml:space="preserve">First entry</w:t>','<w:rPr><w:b/></w:rPr><w:t>First entry</w:t>');
 const response=await handleJournalImportUpload(new Request('https://cms.test/api/cms/journal-import',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/octet-stream','x-cms-site':site,'x-cms-format':'docx','x-cms-action':'review'},body:zip(parts)}),async(_token,name)=>{if(name==='list_editor_sites')return[{id:site}];if(name==='review_journal_import_links')return[];throw Error(name);});
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.applyAvailable,true);assert.equal(result.plan.changes[0].payload.body[1].itemSpans[0][0].bold,true);assert.ok(result.reviewDigest);
});

test('Word document defaults and paragraph/character style chains retain marks in both layouts',async()=>{
 for(const vertical of [false,true]){
  const parts=docx(vertical);
  parts['word/styles.xml']='<w:styles xmlns:w="urn:w"><w:docDefaults><w:rPrDefault><w:rPr><w:i/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Derived"><w:basedOn w:val="Normal"/><w:rPr><w:b/></w:rPr></w:style><w:style w:type="character" w:styleId="Super"><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style></w:styles>';
  parts['word/document.xml']=parts['word/document.xml'].replace('<w:p><w:r><w:t xml:space="preserve">First entry</w:t>','<w:p><w:pPr><w:pStyle w:val="Derived"/></w:pPr><w:r><w:rPr><w:rStyle w:val="Super"/></w:rPr><w:t xml:space="preserve">First </w:t></w:r><w:r><w:rPr><w:b/><w:i w:val="0"/></w:rPr><w:t>entry</w:t>');
  const plan=planJournalImport((await parseJournalDocx(zip(parts))).input);assert.equal(plan.valid,true,JSON.stringify(plan.issues));
  const body=plan.changes[0].payload.body;assert.equal(body[0].spans[0].bold,true);assert.equal(body[0].spans[0].italic,true);
  assert.deepEqual(body[1].itemSpans[0],[{text:'First ',italic:true,bold:false,script:'superscript'},{text:'entry',italic:false,bold:true}]);
 }
});
test('Word style false leaves inherited toggles unchanged while direct false clears them',async()=>{
 const parts=docx();parts['word/styles.xml']='<w:styles xmlns:w="urn:w"><w:style w:type="paragraph" w:styleId="Base"><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:basedOn w:val="Base"/><w:rPr><w:b w:val="0"/></w:rPr></w:style><w:style w:type="character" w:default="1" w:styleId="DefaultFont"><w:rPr><w:i/></w:rPr></w:style></w:styles>';
 parts['word/document.xml']=parts['word/document.xml'].replace('<w:t xml:space="preserve">First entry</w:t>','<w:rPr><w:b w:val="0"/></w:rPr><w:t>First entry</w:t>');
 const body=planJournalImport((await parseJournalDocx(zip(parts))).input).changes[0].payload.body;
 assert.equal(body[0].spans[0].bold,true);assert.deepEqual(body[1].itemSpans[0],[{text:'First entry',bold:false,italic:true}]);
});
test('Word style ambiguity cycles missing parents and conditional table marks cannot silently alter imports',async()=>{
 for(const styles of [
  '<w:style w:type="paragraph" w:default="1" w:styleId="A"><w:basedOn w:val="A"/></w:style>',
  '<w:style w:type="paragraph" w:default="1" w:styleId="A"><w:basedOn w:val="Missing"/></w:style>',
  '<w:style w:type="paragraph" w:default="1" w:styleId="A"/><w:style w:type="paragraph" w:styleId="A"/>',
  '<w:style w:type="paragraph" w:default="1" w:styleId="A"/><w:style w:type="paragraph" w:default="1" w:styleId="B"/>',
  '<w:style w:type="paragraph" w:default="1" w:styleId="A"><w:basedOn w:val="B"/></w:style><w:style w:type="character" w:styleId="B"/>',
  '<w:style w:type="table" w:default="1" w:styleId="Table"><w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr></w:tblStylePr></w:style>'
 ]){const parts=docx();parts['word/styles.xml']=`<w:styles xmlns:w="urn:w">${styles}</w:styles>`;await assert.rejects(()=>parseJournalDocx(zip(parts)),/Word|style/);}
});
test('authenticated review includes inherited Word formatting in the reviewed draft',async()=>{
 const {handleJournalImportUpload}=await import('../lib/cms/journal-import-api.ts'),site='00000000-0000-4000-8000-000000000001',parts=docx();
 parts['word/styles.xml']='<w:styles xmlns:w="urn:w"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr><w:b/></w:rPr></w:style></w:styles>';
 const review=async()=>{const response=await handleJournalImportUpload(new Request('https://cms.test/api/cms/journal-import',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/octet-stream','x-cms-site':site,'x-cms-format':'docx','x-cms-action':'review'},body:zip(parts)}),async(_token,name)=>{if(name==='list_editor_sites')return[{id:site}];if(name==='review_journal_import_links')return[];throw Error(name);});assert.equal(response.status,200);return response.json();};
 const bold=await review();assert.equal(bold.plan.changes[0].payload.body[0].spans[0].bold,true);parts['word/styles.xml']=parts['word/styles.xml'].replace('<w:b/>','<w:i/>');const italic=await review();assert.equal(italic.plan.changes[0].payload.body[0].spans[0].italic,true);assert.notEqual(bold.reviewDigest,italic.reviewDigest);
});
