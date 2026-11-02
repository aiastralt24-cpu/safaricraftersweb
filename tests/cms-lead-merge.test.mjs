import test from 'node:test';import assert from 'node:assert/strict';
import {leadMergeRequest,verifiedLeadMergeReview,verifiedLeadMergeReceipt} from '../lib/cms/lead-merge.ts';
import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),source=uuid(2),target=uuid(3),requestId=uuid(4);
const request={action:'merge',site,source,target,sourceVersion:1,targetVersion:2,requestId},receipt={websiteId:site,sourceId:source,targetId:target,requestId,replayed:false};
const detail=(id,version)=>({id,version,canEdit:true,answers:{email:'person@example.test'},consents:[],status:'new',priority:'normal',assignedTo:null,nextFollowUp:null,outcome:'',externalCrmReference:null});
const review={websiteId:site,sourceId:source,targetId:target,sourceVersion:1,targetVersion:2,policy:'retain_target_preserve_submissions',source:detail(source,1),target:detail(target,2),sourceForm:null,targetForm:null};
const req=body=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('merge review and receipt bind both records, versions, policy and request identity',()=>{
 assert.deepEqual(verifiedLeadMergeReview(review,site,source,target),review);assert.deepEqual(verifiedLeadMergeReceipt(receipt,request),receipt);
 for(const patch of [{sourceId:target},{websiteId:source},{sourceVersion:9},{policy:'copy_consent'},{target:{...review.target,canEdit:false}}])assert.throws(()=>verifiedLeadMergeReview({...review,...patch},site,source,target));
 for(const patch of [{requestId:source},{targetId:source},{websiteId:source}])assert.throws(()=>verifiedLeadMergeReceipt({...receipt,...patch},request));
 assert.equal(leadMergeRequest.safeParse({...request,source:target}).success,false);
});
test('merge API uses fixed privileged operations and forbids field/consent overposting',async()=>{
 let called;const response=await handleLeadCommand(req(request),async(...args)=>{called=args;return receipt;});assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','merge_leads',{p_site:site,p_source:source,p_target:target,p_source_version:1,p_target_version:2,p_request:requestId}]);
 const reviewed=await handleLeadCommand(req({action:'review_merge',site,source,target}),async(...args)=>{assert.equal(args[1],'review_lead_merge');return review;});assert.equal(reviewed.status,200);assert.match(reviewed.headers.get('cache-control'),/no-store/);
 for(const patch of [{consents:[]},{sourceVersion:0},{source:target},{requestId:'bad'}])assert.equal((await handleLeadCommand(req({...request,...patch}),async()=>assert.fail('unexpected RPC'))).status,422);
 assert.notEqual((await handleLeadCommand(req(request),async()=>({...receipt,requestId:source}))).status,200);
});
