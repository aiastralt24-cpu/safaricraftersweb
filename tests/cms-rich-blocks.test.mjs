import test from 'node:test';import assert from 'node:assert/strict';
import {richText,validateComposition} from '../lib/cms/composition.ts';
test('quotes and rectangular tables survive composition storage without losing characters',()=>{
 const body=[{kind:'quote',text:'A traveller’s “field note”.',attribution:'Guest'},{kind:'table',caption:'Trip comparison',headers:['Route','Days'],rows:[['Forest','3'],['Coast','']]}];
 assert.deepEqual(richText.parse(JSON.parse(JSON.stringify(body))),body);
 const result=validateComposition({schemaVersion:1,title:'Comparison',sections:[{id:'text',kind:'text',controls:{label:'Comparison'},data:{title:'Compare',body}}]});assert.equal(result.valid,true);assert.deepEqual(result.page.sections[0].data.body,body);
});
test('tables require captions, headings, bounded rectangular rows and strict fields',()=>{
 const table={kind:'table',caption:'Comparison',headers:['Route'],rows:[['Forest']]};
 for(const patch of [{caption:' '},{headers:['']},{rows:[]},{rows:[['a','b']]},{headers:Array(9).fill('Header')},{rows:Array(51).fill(['x'])},{rows:[['x'.repeat(5001)]]},{html:'<script>bad</script>'}])assert.equal(richText.safeParse([{...table,...patch}]).success,false);
 assert.equal(richText.safeParse([{kind:'quote',text:' ',attribution:'Guest'}]).success,false);
});
