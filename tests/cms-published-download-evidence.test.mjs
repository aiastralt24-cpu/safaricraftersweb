import test from 'node:test';import assert from 'node:assert/strict';
import {pageDownloadReferences,verifiedPublishedDownloadEvidence} from '../lib/cms/published-download-evidence.ts';
const id='00000000-0000-4000-8000-000000000001',version='00000000-0000-4000-8000-000000000002';
const expected={site:id,record:id,revision:version,locale:'fr'},ref={recordId:id,versionId:version};
const value=()=>({websiteId:id,recordId:id,revisionId:version,locale:'fr',documents:[{...ref,locale:'fr',available:true}]});
test('public download evidence requires exact published parent and complete unique selections',()=>{
 assert.deepEqual(verifiedPublishedDownloadEvidence(value(),expected,[ref]),value().documents);
 for(const change of [{websiteId:version},{recordId:version},{revisionId:id},{locale:'en'},{documents:[]},{documents:[...value().documents,...value().documents]},{documents:[{...value().documents[0],locale:'en'}]},{documents:[{...value().documents[0],versionId:id}]},{documents:[{...value().documents[0],storageKey:'private.pdf'}]}])assert.throws(()=>verifiedPublishedDownloadEvidence({...value(),...change},expected,[ref]));
 assert.equal(verifiedPublishedDownloadEvidence({...value(),documents:[{...value().documents[0],available:false}]},expected,[ref])[0].available,false);
 const composition={schemaVersion:1,title:'Documents',sections:[{id:'downloads',kind:'downloads',controls:{label:'Documents'},data:{title:'Documents',items:[{id:'one',label:'One',document:{recordId:id},versionId:version},{id:'two',label:'Two',document:{recordId:id},versionId:version}]}}]};
 assert.deepEqual(pageDownloadReferences(composition),[ref]);assert.throws(()=>pageDownloadReferences({}));
});
