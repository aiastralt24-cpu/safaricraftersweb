import test from 'node:test';import assert from 'node:assert/strict';
import {newApplication,applicationSchema,applicationPath,applicationSaveCommand,applicationDraftFindings} from '../lib/cms/applications.ts';
import {handleApplicationLibrary} from '../lib/cms/application-library-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('applications and industries retain distinct identity, bounded content and claim evidence requirements',()=>{
 for(const kind of ['application','industry']){
  const draft=newApplication(kind);assert.equal(applicationSchema.safeParse(draft).success,true);
  assert.equal(applicationPath(draft.slug,kind),kind==='industry'?'/industries/new-industry':'/applications/new-application');
  assert.deepEqual(applicationDraftFindings(draft).map(f=>f.field),['summary','body']);
  const full={...draft,summary:'Example use',body:[{id:'intro',kind:'paragraph',text:'Example content'}]};assert.deepEqual(applicationDraftFindings(full),[]);
  for(const patch of [{title:''},{kind:'other'},{summary:'x'.repeat(2001)},{body:[full.body[0],full.body[0]]},{relationships:{...draft.relationships,products:[{recordId:id(1)},{recordId:id(1)}]}},{unexpected:true}])assert.equal(applicationSchema.safeParse({...full,...patch}).success,false);
  const claim={id:id(2),statement:'',evidence:[],approvalContact:'',reviewOn:''};assert.equal(applicationDraftFindings({...full,claims:[claim]}).length,4);
  assert.equal(applicationSchema.safeParse({...full,claims:[{...claim,reviewOn:'2026-02-30'}]}).success,false);
 }
});
test('application writes require recovery identity or current revision',()=>{
 const command={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newApplication()};assert.equal(applicationSaveCommand.safeParse(command).success,true);
 for(const patch of [{requestKey:undefined},{record:id(3),expectedRevision:id(4)},{record:null,expectedRevision:id(4)}])assert.equal(applicationSaveCommand.safeParse({...command,...patch}).success,false);
});
test('application library binds classification, scoped filters and pagination integrity',async()=>{
 const req=q=>new Request('https://site.test/api/cms/applications?site='+id(1)+q,{headers:{authorization:'Bearer a.b.c'}});
 const response=await handleApplicationLibrary(req('&kind=industry&owned=mine'),async(_,name,args)=>{assert.equal(name,'search_application_library');assert.equal(args.p_kind,'industry');assert.equal(args.p_owned,true);return {records:[],next:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const query of ['&kind=unknown','&limit=101','&kind=industry&kind=application','&search='+ 'x'.repeat(121)])assert.equal((await handleApplicationLibrary(req(query),async()=>assert.fail())).status,400);
 assert.equal((await handleApplicationLibrary(req(''),async()=>({records:[],next:id(2)}))).status,500);
});
