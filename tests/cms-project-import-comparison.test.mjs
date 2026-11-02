import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject} from '../lib/cms/projects.ts';
import {compareProjectImport} from '../lib/cms/project-import-comparison.ts';
test('project import comparisons expose replacements and removals while omitting unchanged fields',()=>{
 const before={...newProject(),title:'Original',summary:'Keep this',image:{assetId:'old-photo',alt:'Old image',decorative:false},claims:[{id:'11111111-1111-4111-8111-111111111111',statement:'Original claim',evidence:[],approvalContact:'Reviewer',reviewOn:''}]};
 const {image,...rest}=before,after={...rest,title:'Replacement',claims:[]};
 const rows=compareProjectImport(before,after);
 assert.deepEqual(rows.map(row=>row.field),['title','image','claims']);
 assert.equal(rows[0].before,'Original');assert.equal(rows[0].after,'Replacement');assert.equal(rows[1].after,null);assert.deepEqual(rows[2].after,[]);assert.equal(before.summary,'Keep this');
 assert.deepEqual(compareProjectImport(before,structuredClone(before)),[]);
 assert.ok(compareProjectImport(null,after).some(row=>row.field==='summary'&&row.before===null&&row.after==='Keep this'));
});
