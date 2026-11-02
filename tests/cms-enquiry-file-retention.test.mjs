import test from 'node:test';import assert from 'node:assert/strict';import {handleLeadCommand} from '../lib/cms/leads-api.ts';import {enquiryFileRetentionPolicy,verifyRetentionPreview} from '../lib/cms/enquiry-file-retention.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),policy={enabled:false,submittedDays:null,abandonedHours:null,approvalReference:''};
const req=body=>new Request('https://cms.test/api/cms/leads',{method:'POST',headers:{authorization:'Bearer user.jwt.token','content-type':'application/json'},body:JSON.stringify(body)});
test('retention configuration requires explicit approved periods to enable, with no invented defaults',()=>{assert.deepEqual(enquiryFileRetentionPolicy.parse(policy),policy);for(const patch of [{enabled:true},{submittedDays:0},{abandonedHours:0},{submittedDays:1.5},{extra:true}])assert.equal(enquiryFileRetentionPolicy.safeParse({...policy,...patch}).success,false);assert.equal(enquiryFileRetentionPolicy.safeParse({...policy,enabled:true,submittedDays:90,abandonedHours:24,approvalReference:'Synthetic fixture approval'}).success,true);});
test('retention API binds user identity, scope and exact save receipt',async()=>{
 const input={action:'save_retention',site,expected:0,requestId:id(2),policy};const response=await handleLeadCommand(req(input),async(token,name,args)=>{assert.equal(token,'user.jwt.token');assert.equal(name,'save_enquiry_file_retention');assert.deepEqual(args,{p_site:site,p_expected:0,p_request:id(2),p_policy:policy});return {websiteId:site,version:1,policy};});assert.equal(response.status,200);
 for(const result of [{websiteId:id(9),version:1,policy},{websiteId:site,version:2,policy},{websiteId:site,version:1,policy:{...policy,submittedDays:30}}])assert.notEqual((await handleLeadCommand(req(input),async()=>result)).status,200);
});
test('retention preview rejects stale versions, invalid totals and private details',()=>{
 const value={websiteId:site,version:1,enabled:false,asOf:new Date().toISOString(),hasMore:false,candidateCount:3,submittedCount:1,abandonedCount:2,plannedBytes:100};assert.deepEqual(verifyRetentionPreview(value,site,1),value);
 for(const patch of [{version:2},{candidateCount:4},{hasMore:true},{paths:['private']}])assert.throws(()=>verifyRetentionPreview({...value,...patch},site,1));
});

test('retention save recovery is scoped, immutable until resolved and fails closed on storage errors',async()=>{
 const {readRetentionSave,retainRetentionSave,clearRetentionSave,retentionSaveKey}=await import('../lib/cms/enquiry-file-retention-client.ts');const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},actor=id(3),pending={actor,command:{action:'save_retention',site,expected:0,requestId:id(4),policy}};
 retainRetentionSave(storage,pending);assert.deepEqual(readRetentionSave(storage,actor,site),pending);assert.equal(readRetentionSave(storage,id(9),site),null);
 assert.throws(()=>retainRetentionSave(storage,{...pending,command:{...pending.command,requestId:id(5)}}));assert.throws(()=>clearRetentionSave(storage,{...pending,command:{...pending.command,requestId:id(5)}}));clearRetentionSave(storage,pending);assert.equal(readRetentionSave(storage,actor,site),null);
 assert.throws(()=>retainRetentionSave({getItem:()=>null,setItem:()=>{}},pending));storage.setItem(retentionSaveKey(actor,site),'broken');assert.throws(()=>readRetentionSave(storage,actor,site));
});
