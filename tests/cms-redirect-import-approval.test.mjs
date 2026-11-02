import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedRedirectProposal,verifiedRedirectProposalList} from '../lib/cms/redirect-import-approval.ts';
import {handleRedirectApproval} from '../lib/cms/redirect-import-approval-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),proposal=id(2),record=id(3),row={sourcePath:'/old',destinationPath:'/new',locale:'en',enabled:true,recordId:null,index:0,status:'new',reason:'eligible',target:record,published:false,snapshot:'a'.repeat(32)};
const fixture={site,actor:id(4),requestKey:id(5),proposalId:proposal,status:'submitted',sourceDigest:'a'.repeat(64),review:{site,items:[row]},stale:false,canDecide:true,reviewedBy:null};
test('redirect approval evidence is identity-bound and list ordering is verified',()=>{
 assert.equal(verifiedRedirectProposal(fixture,site,proposal).status,'submitted');
 for(const patch of [{site:id(9)},{proposalId:id(9)},{status:'approved'},{review:{site,items:[{...row,status:'blocked'}]}}])assert.throws(()=>verifiedRedirectProposal({...fixture,...patch},site,proposal));
 const list={site,items:[{proposalId:proposal,status:'submitted',count:1}],nextCursor:null};assert.deepEqual(verifiedRedirectProposalList(list,site,null),list);assert.throws(()=>verifiedRedirectProposalList({...list,nextCursor:proposal},site,null));assert.throws(()=>verifiedRedirectProposalList({...list,items:[...list.items,...list.items]},site,null));
});
test('redirect decision API enforces strict commands and refuses unconfirmed decisions',async()=>{
 const req=(body,headers={})=>new Request('https://cms.test/api/cms/redirects/proposals',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
 const body={site,action:'decide',proposal,decision:'approved'};let calls=0;
 const response=await handleRedirectApproval(req(body),async(token,name,args)=>{calls++;assert.equal(name,'decide_redirect_import_proposal');assert.deepEqual(args,{p_site:site,p_proposal:proposal,p_decision:'approved'});return {...fixture,status:'approved',reviewedBy:id(6),canDecide:false};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.ok((await handleRedirectApproval(req(body),async()=>fixture)).status>=400);
 for(const request of [req({...body,force:true}),req({...body,decision:'published'}),req(body,{origin:'https://evil.test'}),req(body,{authorization:''})])assert.ok((await handleRedirectApproval(request,async()=>{calls++;return fixture;})).status>=400);assert.equal(calls,1);
});

test('redirect application receipts bind changed rows, destination jobs and terminal state',async()=>{
 const applied={...fixture,status:'applied',canDecide:false,canApply:false,reviewedBy:id(6),application:{site,proposalId:proposal,changes:1,jobs:[]}};
 assert.equal(verifiedRedirectProposal(applied,site,proposal).application.changes,1);
 for(const patch of [{application:null},{canApply:true},{application:{...applied.application,changes:2}},{application:{...applied.application,site:id(9)}},{application:{...applied.application,jobs:[{jobId:id(7),recordId:record,revisionId:id(8)}]}}])assert.throws(()=>verifiedRedirectProposal({...applied,...patch},site,proposal));
 const published={...applied,review:{site,items:[{...row,published:true}]},application:{...applied.application,jobs:[{jobId:id(7),recordId:record,revisionId:id(8)}]}};assert.equal(verifiedRedirectProposal(published,site,proposal).application.jobs.length,1);
 const req=new Request('https://cms.test/api/cms/redirects/proposals',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json'},body:JSON.stringify({site,proposal,action:'apply'})});
 const response=await handleRedirectApproval(req,async(token,name,args)=>{assert.equal(name,'apply_redirect_import');assert.deepEqual(args,{p_site:site,p_proposal:proposal});return applied;});assert.equal(response.status,200);
});
