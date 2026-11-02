import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';import {compareNewsImport} from '../lib/cms/news-import-comparison.ts';
test('News import comparison exposes removed media and changed private notes while preserving unchanged copy',()=>{
 const before={...newNews(),title:'Original',summary:'Keep this',image:{assetId:'photo',alt:'Photo',decorative:false},internalNotes:'Old note'};
 const {image,...rest}=before,after={...rest,title:'Updated',internalNotes:'New note'};
 const rows=compareNewsImport(before,after);assert.deepEqual(rows.map(r=>r.field),['title','image','internalNotes']);assert.equal(rows.find(r=>r.field==='image').after,null);assert.equal(rows.find(r=>r.field==='internalNotes').before,'Old note');assert.deepEqual(compareNewsImport(before,structuredClone(before)),[]);assert.ok(compareNewsImport(null,after).some(r=>r.field==='summary'&&r.after==='Keep this'));
});
