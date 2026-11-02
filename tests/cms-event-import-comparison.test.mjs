import test from 'node:test';import assert from 'node:assert/strict';
import {newEvent} from '../lib/cms/events.ts';import {compareEventImport} from '../lib/cms/event-import-comparison.ts';
test('Event import comparison exposes removed media and changed private notes while preserving unchanged copy',()=>{
 const before={...newEvent(),title:'Original',summary:'Keep this',image:{assetId:'photo',alt:'Photo',decorative:false},internalNotes:'Old note'};
 const {image,...rest}=before,after={...rest,title:'Updated',internalNotes:'New note'};
 const rows=compareEventImport(before,after);assert.deepEqual(rows.map(r=>r.field),['title','image','internalNotes']);assert.equal(rows.find(r=>r.field==='image').after,null);assert.equal(rows.find(r=>r.field==='internalNotes').before,'Old note');assert.deepEqual(compareEventImport(before,structuredClone(before)),[]);assert.ok(compareEventImport(null,after).some(r=>r.field==='summary'&&r.after==='Keep this'));
});
