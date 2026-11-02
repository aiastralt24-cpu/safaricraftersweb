import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {newForm,newFormField} from '../lib/cms/form-drafts.ts';
const record={type:'form',path:null,payload:newForm('name')};
test('valid inbox-only forms have versioned checks and explicit delivery warning',()=>{
 const before=structuredClone(record),result=validateStoredContent(record);
 assert.equal(result.contentChecksPass,true);assert.equal(result.validatorVersion,'form-1');assert.deepEqual(result.findings.map(f=>[f.code,f.severity]),[['inbox_only','warning']]);assert.deepEqual(record,before);
});
test('publication rejects unsupported delivery features and malformed stored forms',()=>{
 for(const value of [{...record,path:'/forms/test'},{...record,payload:{...record.payload,notificationRouteIds:['00000000-0000-4000-8000-000000000001']}},{...record,payload:{...record.payload,fields:[newFormField('file','attachment')]}},{...record,payload:{...record.payload,fields:[]}},{...record,payload:{...record.payload,unknown:true}}])assert.equal(validateStoredContent(value).contentChecksPass,false);
});
