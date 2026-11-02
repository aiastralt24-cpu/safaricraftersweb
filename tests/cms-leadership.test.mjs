import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership,leadershipSchema,leadershipSaveCommand,leadershipDraftFindings} from '../lib/cms/leadership.ts';
import {handleLeadershipLibrary} from '../lib/cms/leadership-library-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('leadership drafts allow incomplete biographies but report editorial requirements',()=>{
 const draft=newLeadership();assert.equal(leadershipSchema.safeParse(draft).success,true);
 assert.deepEqual(leadershipDraftFindings(draft).map(f=>f.field),['role','summary','body']);
 const complete={...draft,role:'Director',summary:'Synthetic summary',body:[{id:'bio',kind:'paragraph',text:'Synthetic biography.'}]};assert.deepEqual(leadershipDraftFindings(complete),[]);
 for(const patch of [{title:''},{role:'x'.repeat(201)},{sortOrder:-1},{status:'unknown'},{links:[{label:'Profile',href:'javascript:alert(1)'}]},{body:[complete.body[0],complete.body[0]]},{relationships:{...draft.relationships,pages:[{recordId:id(1)},{recordId:id(1)}]}}])assert.equal(leadershipSchema.safeParse({...draft,...patch}).success,false);
});
test('leadership save intentions bind new requests and existing revisions',()=>{
 const command={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newLeadership()};assert.equal(leadershipSaveCommand.safeParse(command).success,true);assert.equal(leadershipSaveCommand.safeParse({...command,requestKey:undefined}).success,false);assert.equal(leadershipSaveCommand.safeParse({...command,record:id(3),expectedRevision:id(4)}).success,false);
});
test('leadership library forwards bounded filters and rejects unsafe pagination responses',async()=>{
 const request=q=>new Request('https://site.test/api/cms/leadership?site='+id(1)+q,{headers:{authorization:'Bearer a.b.c'}});
 const response=await handleLeadershipLibrary(request('&department=Board&owned=mine'),async(token,name,args)=>{assert.equal(name,'search_leadership_library');assert.equal(args.p_department,'Board');assert.equal(args.p_owned,true);return {records:[],next:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const query of ['&department='+ 'x'.repeat(121),'&status=deleted','&limit=101','&owned=mine&owned=all'])assert.equal((await handleLeadershipLibrary(request(query),async()=>assert.fail())).status,400);
 assert.equal((await handleLeadershipLibrary(request(''),async()=>({records:[],next:id(8)}))).status,500);
});
