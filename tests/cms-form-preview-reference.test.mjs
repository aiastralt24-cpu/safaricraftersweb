import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFormPreviewReference} from '../lib/cms/form-preview-reference.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const value={id,type:'form',currentRevision:revision,payload:newForm('name'),permissions:{edit:false}};
test('linked form preview binds identity and validates the complete saved definition',()=>{
 const result=parseFormPreviewReference(value,id);assert.equal(result.revision,revision);assert.equal(result.definition.fields[0].id,'name');
 for(const input of [null,{...value,id:revision},{...value,type:'page'},{...value,payload:{...value.payload,fields:[]}},{...value,payload:{...value.payload,notificationRouteIds:['bad']}}])assert.throws(()=>parseFormPreviewReference(input,id));
});
