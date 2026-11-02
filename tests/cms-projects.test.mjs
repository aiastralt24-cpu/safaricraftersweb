import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,projectSchema,projectDraftFindings} from '../lib/cms/projects.ts';import {handleProjectSave} from '../lib/cms/project-editor-api.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),record=uuid(2),revision=uuid(3),key=uuid(4);
const request=body=>new Request('https://site.test/api/cms/projects',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('projects retain structured copy and relationships while keeping incomplete drafts identifiable',()=>{const draft=newProject();assert.equal(projectSchema.safeParse(draft).success,true);assert.equal(projectDraftFindings(draft).length,3);draft.body=[{kind:'paragraph',text:'Literal <script> text'},{kind:'quote',text:'Quoted result',attribution:'Source'}];draft.relationships.documents=[{recordId:uuid(5)}];assert.deepEqual(projectSchema.parse(draft).body,draft.body);for(const patch of [{slug:'../private'},{completedOn:'2026-02-30'},{relationships:{...draft.relationships,documents:[{recordId:uuid(5)},{recordId:uuid(5)}]}},{extra:'discard me'}])assert.equal(projectSchema.safeParse({...draft,...patch}).success,false);});
test('project draft endpoint derives identity, uses durable creation and refuses cross-type/stale edits',async()=>{
 const payload=newProject();let called;const create=await handleProjectSave(request({action:'save',site,record:null,expectedRevision:null,requestKey:key,payload}),async(...args)=>{called=args;return {recordId:record,revisionId:revision};});assert.equal(create.status,200);assert.equal(called[1],'create_draft_once');assert.equal(called[2].p_type,'project');assert.equal(called[2].p_path,'/projects/new-case-study');assert.equal((await create.json()).requestKey,key);
 const body={action:'save',site,record,expectedRevision:revision,locale:'en',payload},stored={id:record,type:'project',path:'/projects/new-case-study',locale:'en',currentRevision:revision};
 assert.equal((await handleProjectSave(request(body),async(token,name,args)=>name==='get_editor_record'?stored:{recordId:record,revisionId:uuid(6)})).status,200);
 for(const [patch,status]of [[{type:'page'},404],[{currentRevision:uuid(9)},409],[{path:'/other'},422],[{locale:'fr'},422]])assert.equal((await handleProjectSave(request(body),async(token,name)=>{assert.equal(name,'get_editor_record');return {...stored,...patch};})).status,status);
 for(const patch of [{requestKey:key},{payload:{...payload,extra:true}},{type:'page'}])assert.equal((await handleProjectSave(request({...body,...patch}),async()=>assert.fail('Unexpected write'))).status,422);
});

test('claim evidence remains a bounded draft record without granting approval',()=>{
 const legacy=newProject();delete legacy.claims;assert.deepEqual(projectSchema.parse(legacy).claims,[]);
 const claim={id:uuid(20),statement:'Performance claim',evidence:[{recordId:uuid(21)}],approvalContact:'Review contact',reviewOn:'2027-01-01'};
 const draft={...newProject(),claims:[claim]};assert.deepEqual(projectSchema.parse(draft).claims,[claim]);
 for(const claims of [[claim,claim],[{...claim,reviewOn:'2027-02-30'}],[{...claim,approved:true}],[{...claim,evidence:[{recordId:uuid(21)},{recordId:uuid(21)}]}],[{...claim,statement:'x'.repeat(2001)}]])assert.equal(projectSchema.safeParse({...draft,claims}).success,false);
 const incomplete={...claim,statement:' ',evidence:[],approvalContact:'',reviewOn:''};assert.equal(projectDraftFindings({...draft,claims:[incomplete]}).filter(f=>f.field.startsWith('claims.')).length,4);
});
