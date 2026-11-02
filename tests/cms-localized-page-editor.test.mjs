import test from 'node:test';
import assert from 'node:assert/strict';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const site=id(1),record=id(2),revision=id(3),path='/notre-histoire';
const payload={composition:{schemaVersion:1,title:'Notre histoire',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Notre histoire',body:[{kind:'paragraph',text:'Notre récit.'}]}},{id:'downloads',kind:'downloads',controls:{label:'Documents'},data:{title:'Guides',items:[{id:'guide',label:'Guide',document:{recordId:id(6)},versionId:id(7)}]}}]}};
const evidence=()=>({localizedEvidence:{websiteId:site,recordId:record,revisionId:revision,locale:'fr',path,registry:{websiteId:site,locale:'fr',routes:[{path,available:true,recordId:record,revisionId:revision}]}},downloadStatus:[{recordId:id(6),versionId:id(7),available:true}]});
async function check(value,p=payload){
 const request=new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'validate',site,record,revision})});
 const response=await handleEditorCommand(request,async(token,name,args)=>{
  assert.equal(token,'a.b.c');
  if(name==='get_editor_record')return {id:record,type:'page',path,locale:'fr',currentRevision:revision,payload:p};
  assert.deepEqual(args,{p_site:site,p_record:record,p_revision:revision});
  if(name==='get_record_media_status')return [];
  assert.equal(name,'get_editor_localized_page_evidence');return value;
 });
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const {result}=await response.json();assert.equal(result.publicationAuthorized,false);return result;
}
test('translated editor checks accept verified saved page and document evidence without granting publication',async()=>{
 assert.equal((await check(evidence())).contentChecksPass,true);
 for(const mutate of [v=>v.localizedEvidence.revisionId=id(9),v=>v.localizedEvidence.websiteId=id(9),v=>v.localizedEvidence.locale='de',v=>v.localizedEvidence.registry.routes[0].revisionId=id(9),v=>v.downloadStatus[0].available=false,v=>v.downloadStatus=[],v=>v.privateField=true]){
  const value=evidence();mutate(value);assert.equal((await check(value)).contentChecksPass,false);
 }
 assert.equal((await check(null)).contentChecksPass,false);
});
test('translated editor checks retain composition and media failures',async()=>{
 const invalid=structuredClone(payload);invalid.composition.sections[0].controls.headingLevel='h2';assert.equal((await check(evidence(),invalid)).contentChecksPass,false);
 const media=structuredClone(payload);media.composition.sections.push({id:'image',kind:'imageText',controls:{label:'Image'},data:{title:'Portrait',body:[{kind:'paragraph',text:'Texte'}],image:{assetId:id(8),alt:'Portrait',decorative:false}}});
 assert.ok((await check(evidence(),media)).findings.some(f=>f.code==='asset_verification_required'));
});
