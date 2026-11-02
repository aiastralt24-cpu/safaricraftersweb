import test from 'node:test';import assert from 'node:assert/strict';
import {newProject} from '../lib/cms/projects.ts';import {projectPublishedProject} from '../lib/cms/published-project.ts';import {publicProjectConfig,readPublishedProject,readPublishedProjects} from '../lib/cms/public-project-runtime.ts';import {usesCmsProjects,publishedProjectMetadata,publishedProjectStructuredData} from '../lib/cms/project-route.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,draft={...newProject(),summary:'Summary',body:[{kind:'paragraph',text:'Literal <script> copy'}],image:{assetId:'public-project',alt:'Project',decorative:false}};const {claims,relationships,...payload}=draft;const envelope={recordId:id(1),revisionId:id(2),type:'project',path:'/projects/new-case-study',locale:'en',payload,related:[]};
test('published project contract refuses internal fields and mismatched or incomplete public content',()=>{
 const value=projectPublishedProject(envelope,envelope.path);assert.equal(value.content.summary,'Summary');assert.equal('claims' in value.content,false);
 for(const patch of [{claims:[]},{relationships},{approvalContact:'private'},{summary:' '},{image:undefined}])assert.throws(()=>projectPublishedProject({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedProject(envelope,'/projects/other'));assert.throws(()=>projectPublishedProject(envelope,envelope.path,'fr'));
 assert.equal(publishedProjectMetadata(value).description,'Summary');assert.equal(publishedProjectStructuredData(value,'https://example.test').url,'https://example.test/projects/new-case-study');
});
test('project delivery is disabled by default and uses only anonymous project readers',async()=>{
 assert.equal(publicProjectConfig({}),null);assert.equal(usesCmsProjects({CMS_PROJECT_DELIVERY_ENABLED:'true'}),false);let calls=0;
 const config={site:id(3),read:async(site,path)=>{calls++;assert.equal(site,id(3));assert.equal(path,envelope.path);return envelope;},list:async()=>[]};
 assert.equal(await readPublishedProject('../private',config),null);assert.equal(calls,0);assert.equal((await readPublishedProject('new-case-study',config)).recordId,id(1));await assert.rejects(()=>readPublishedProject('new-case-study',null),/not configured/);
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_PROJECT_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(3),CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'anonymous-fixture'};const real=publicProjectConfig(env,async(url,options)=>{assert.match(String(url),/get_public_project$/);assert.equal(options.headers.apikey,'anonymous-fixture');return Response.json(envelope);});assert.equal((await readPublishedProject('new-case-study',real)).path,envelope.path);
});
test('public project lists reject duplicate routes and unstable pagination',async()=>{
 const row={recordId:id(1),revisionId:id(2),path:envelope.path,modifiedAt:'2026-10-29T00:00:00Z',title:payload.title,summary:payload.summary,image:payload.image,industry:'',kind:'caseStudy',seo:payload.seo};const config={site:id(3),read:async()=>null,list:async()=>[row]};assert.equal((await readPublishedProjects(config)).length,1);
 await assert.rejects(()=>readPublishedProjects({...config,list:async()=>[row,{...row,recordId:id(4)}]}),/pagination/);await assert.rejects(()=>readPublishedProjects({...config,list:async()=>[{...row,claims:[]}]}));
});

test('related project cards accept only public local routes and reject private or duplicate metadata',()=>{
 const related=[{type:'project',title:'Another project',href:'/projects/another'},{type:'destination',title:'Destination',href:'/destinations/example'},{type:'document',title:'Guide',href:`/api/documents/download?record=${id(8)}&revision=${id(9)}`}];assert.deepEqual(projectPublishedProject({...envelope,related},envelope.path).related,related);
 for(const rows of [[{...related[0],href:'https://evil.test'}],[{...related[0],href:envelope.path}],[{...related[0],href:'/api/private'}],[{...related[2],href:`/api/documents/download?record=${id(8)}`}],[{...related[0],privateNote:'secret'}],[related[0],related[0]]])assert.throws(()=>projectPublishedProject({...envelope,related:rows},envelope.path));
});
