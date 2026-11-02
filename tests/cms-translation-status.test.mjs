import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedTranslationStatus} from '../lib/cms/translation-status.ts';
const [record,revision,source,sourceRevision,other]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const status={recordId:record,revisionId:revision,locale:'fr',sourceRecordId:source,sourceLocale:'en',sourceRevisionId:sourceRevision,currentSourceRevisionId:sourceRevision,reviewedRevisionId:null,status:'unreviewed'};
test('translation editor accepts only the selected saved revision and consistent status',()=>{
 assert.deepEqual(verifiedTranslationStatus(status,record,revision),status);
 assert.equal(verifiedTranslationStatus(null,record,revision),null);
 for(const value of [undefined,{}, {...status,recordId:other},{...status,revisionId:other},{...status,status:'current'},{...status,privateField:'secret'}])assert.throws(()=>verifiedTranslationStatus(value,record,revision),/Reload this record/);
});
