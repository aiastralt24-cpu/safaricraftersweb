import test from 'node:test';import assert from 'node:assert/strict';import {handlePageUrlProposal} from '../lib/cms/page-url-proposal-api.ts';
const [site,record,revision,proposal,requestKey,actor]=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const command={action:'propose',site,record,revision,path:'/new',snapshot:'a'.repeat(32),redirect:'permanent',reason:null,requestKey};
const result={proposalId:proposal,site,recordId:record,revisionId:revision,oldPath:'/old',newPath:'/new',locale:'en',redirectChoice:'permanent',noRedirectReason:null,status:'submitted',stale:false,createdBy:actor,reviewedBy:null};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/page-url-proposals',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('proposal API binds requested decisions and preserves caller authorization',async()=>{
 let seen;const response=await handlePageUrlProposal(request(command),async(...args)=>{seen=args;return result;});assert.equal(response.status,200);assert.deepEqual(seen,['a.b.c','propose_page_url',{p_site:site,p_record:record,p_revision:revision,p_path:'/new',p_snapshot:command.snapshot,p_redirect:'permanent',p_reason:null,p_request:requestKey}]);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const action of ['read','approve','reject','cancel']){let call;assert.equal((await handlePageUrlProposal(request({action,site,proposal}),async(...args)=>{call=args;return {...result,status:({approve:'approved',reject:'rejected',cancel:'cancelled'})[action]??result.status};})).status,200);assert.equal(call[0],'a.b.c');assert.equal(call[1],action==='read'?'get_page_url_proposal':'review_page_url_proposal');assert.equal(call[2].p_proposal,proposal);if(action!=='read')assert.equal(call[2].p_action,action);}
});
test('malformed or cross-origin proposals do not reach persistence; wrong receipts fail closed',async()=>{
 for(const patch of [{redirect:'temporary'},{snapshot:'bad'},{reason:'x'.repeat(2001)},{path:''},{requestKey:null},{apply:true}])assert.equal((await handlePageUrlProposal(request({...command,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handlePageUrlProposal(request(command,{Authorization:''}),async()=>assert.fail())).status,401);assert.equal((await handlePageUrlProposal(request(command,{Origin:'https://outside.test'}),async()=>assert.fail())).status,403);
 for(const patch of [{site:record},{newPath:'/other'},{redirectChoice:'none'},{revisionId:record}])assert.equal((await handlePageUrlProposal(request(command),async()=>({...result,...patch}))).status,502);
});

test('proposal discovery forwards page scope and rejects mismatched lists',async()=>{
 const listing={site,recordId:record,items:[{proposalId:proposal,oldPath:'/old',newPath:'/new',status:'submitted',redirectChoice:'permanent'}],nextCursor:null};let call;
 const response=await handlePageUrlProposal(request({action:'list',site,record}),async(...args)=>{call=args;return listing;});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','list_page_url_proposals',{p_site:site,p_record:record,p_after:null}]);
 assert.notEqual((await handlePageUrlProposal(request({action:'list',site,record}),async()=>({...listing,site:record}))).status,200);
});
test('proposal client checks exact record identity and pagination',async()=>{
 const {parsePageUrlProposal,parsePageUrlProposalList}=await import('../lib/cms/page-url-proposal.ts');assert.deepEqual(parsePageUrlProposal(result,{site,record,proposal}),result);assert.throws(()=>parsePageUrlProposal({...result,recordId:site},{site,record,proposal}));
 const row={proposalId:proposal,oldPath:'/old',newPath:'/new',status:'submitted',redirectChoice:'permanent'},listing={site,recordId:record,items:[row],nextCursor:null};
 assert.deepEqual(parsePageUrlProposalList(listing,{site,record,after:null}),listing);
 for(const patch of [{recordId:site},{items:[row,row]},{nextCursor:proposal}])assert.throws(()=>parsePageUrlProposalList({...listing,...patch},{site,record,after:null}));
 assert.throws(()=>parsePageUrlProposalList(listing,{site,record,after:proposal}));
});

test('URL submission recovery binds stored manifests to actor, page and server receipt',async()=>{
 const {parseUrlSubmission,verifySubmittedProposal,parseUrlSubmissionStatus,urlSubmissionStorageKey}=await import('../lib/cms/page-url-proposal.ts');const {action,...rest}=command,pending={...rest,actor};const scope={actor,site,record};
 assert.deepEqual(parseUrlSubmission(JSON.stringify(pending),scope),pending);assert.match(urlSubmissionStorageKey(scope),/^cms-url-submission:/);
 for(const patch of [{actor:record},{site:record},{record:site},{path:''},{snapshot:'bad'},{redirect:'temporary'}])assert.throws(()=>parseUrlSubmission(JSON.stringify({...pending,...patch}),scope));
 assert.deepEqual(verifySubmittedProposal(result,pending),result);for(const patch of [{createdBy:site},{revisionId:record},{newPath:'/other'}])assert.throws(()=>verifySubmittedProposal({...result,...patch},pending));
 const completed={status:'completed',requestKey,recordId:record,proposal:result};assert.deepEqual(parseUrlSubmissionStatus(completed,pending),completed);assert.throws(()=>parseUrlSubmissionStatus({...completed,requestKey:site},pending));
 for(const action of ['submission_status','stop_submission']){let call;const response=await handlePageUrlProposal(request({action,site,record,requestKey}),async(...args)=>{call=args;return completed;});assert.equal(response.status,200);assert.equal(call[1],action==='submission_status'?'get_page_url_submission':'cancel_page_url_submission');assert.deepEqual(call[2],{p_site:site,p_record:record,p_request:requestKey});}
});

test('URL application forwards authenticated proposal identity and requires applied confirmation',async()=>{
 let call;const body={action:'apply',site,proposal};assert.equal((await handlePageUrlProposal(request(body),async(...args)=>{call=args;return {...result,status:'applied'};})).status,200);
 assert.deepEqual(call,['a.b.c','apply_page_url_proposal',{p_site:site,p_proposal:proposal}]);
 for(const patch of [{status:'approved'},{status:'applied',proposalId:record},{status:'applied',site:record}])assert.equal((await handlePageUrlProposal(request(body),async()=>({...result,...patch}))).status,502);
});
