import test from 'node:test';import assert from 'node:assert/strict';
import {expeditionReferenceFindings} from '../lib/cms/expedition-reference-status.ts';
import {newPhotoExpedition,validatePhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {runValidationQueue} from '../lib/cms/validation-queue-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const value={...newPhotoExpedition(),specialists:[{recordId:id(2),role:'mentor'},{recordId:id(2),role:'guide'}],enquiry:{...newPhotoExpedition().enquiry,form:{recordId:id(3)}}};
const record={record:id(1),type:'photoExpedition',path:'/photo-expeditions/new-expedition',locale:'en',payload:value};
const evidence=[{recordId:id(2),available:true,type:'specialist',locale:'en',publishedRevisionId:id(4)},{recordId:id(3),available:true,type:'form',locale:'en',publishedRevisionId:id(5)}];
test('expedition references require exact, current, typed evidence while allowing one specialist in two roles',()=>{
 assert.deepEqual(expeditionReferenceFindings(record,value,evidence),[]);
 for(const bad of [undefined,[],[...evidence,evidence[0]],[...evidence,{recordId:id(9),available:false}],[{recordId:id(2),available:false},evidence[1]],[{...evidence[0],type:'form'},evidence[1]],[{...evidence[0],locale:'fr'},evidence[1]],[{...evidence[0],publishedRevisionId:'invalid'},evidence[1]]])assert.ok(expeditionReferenceFindings(record,value,bad).length);
 assert.ok(expeditionReferenceFindings({...record,record:id(2)},value,evidence).some(f=>f.message.includes('itself')));
 assert.ok(validatePhotoExpedition(record,[],evidence).findings.some(f=>f.code==='expedition_required'));
});
test('queued validation forwards expedition evidence and incomplete content remains invalid',async()=>{
 let receipt;const job={id:id(6),site:id(7),record:id(1),revision:id(8),token:id(9)};
 const result=await runValidationQueue(async(proc,args)=>{
  if(proc==='claim_validations')return [job];
  if(proc==='get_validation_job_input')return {...record,site:job.site,revision:job.revision,expeditionStatus:evidence};
  receipt=args;return null;
 });
 assert.equal(result[0].status,'invalid');assert.equal(receipt.p_valid,false);
 assert.equal(receipt.p_findings.some(f=>f.code==='expedition_reference_verification'),false);
 assert.ok(receipt.p_findings.some(f=>f.code==='expedition_required'));
});

test('complete supported expeditions pass while unsupported film and stale reference evidence remain blocked',()=>{
 const image={assetId:'processed',alt:'Forest'};
 const payload={...value,category:'Photography',skill:'All',groupSize:'Six',duration:'Five days',description:'Forest',intro:'Explore',mentor:'Guide',heroTitle:'Forest',heroCopy:'Field notes',price:'Enquire for price',image,heroImage:image};
 const media=[{assetId:'processed',available:true}];const good=validatePhotoExpedition({...record,payload},media,evidence);assert.equal(good.contentChecksPass,true);assert.equal(good.validatorVersion,'expedition-1');
 const film={...payload,video:{assetId:'film',title:'Film',poster:image,caption:'Film caption',transcript:'Transcript',captionsAssetId:'captions'}};
 assert.equal(validatePhotoExpedition({...record,payload:film},[...media,{assetId:'film',available:true}],evidence).contentChecksPass,false);
 assert.equal(validatePhotoExpedition({...record,payload},media,[evidence[0],{recordId:id(3),available:false}]).contentChecksPass,false);
 assert.equal(validatePhotoExpedition({...record,payload},[{assetId:'processed',available:false}],evidence).contentChecksPass,false);
});
