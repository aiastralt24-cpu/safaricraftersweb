import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationSchema,newDestination,validateDestinationDraft} from '../lib/cms/destinations.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const site='00000000-0000-4000-8000-000000000001';
test('destination draft preserves the full editorial model without granting publication',()=>{
 const value=newDestination();value.editorial.scoop=[{title:'Forest mornings',blurb:'Listen before moving',body:'A longer field note.'}];value.fieldIntelligence.airport='Local gateway';value.faqs=[{question:'When to visit?',answer:'Discuss seasonal access.'}];value.sources=[{title:'Source',url:'https://example.test/research',publisher:'Research team',accessedAt:'2026-10-22'}];
 assert.deepEqual(destinationSchema.parse(value),value);const validation=validateDestinationDraft({path:'/destinations/new-destination',payload:value});assert.equal(validation.contentChecksPass,false);assert.ok(validation.findings.some(f=>f.code==='incomplete_destination'));
 assert.ok(validateDestinationDraft({path:'/destinations/wrong',payload:value}).findings.some(f=>f.code==='path_mismatch'));
});
test('destination schema rejects silent legacy fields, unsafe sources, inaccessible images and duplicate references',()=>{
 const value=newDestination(),ref={recordId:site};
 for(const invalid of [{...value,unknownEditorial:'lost'},{...value,image:{src:'/legacy.jpg',alt:'Forest',credit:''}},{...value,image:{assetId:'forest',alt:'',decorative:false}},{...value,journeys:[ref,ref]},{...value,slug:'../escape'},{...value,sources:[{title:'Unsafe',url:'javascript:alert(1)',publisher:'',accessedAt:'2026-10-22'}]}])assert.equal(destinationSchema.safeParse(invalid).success,false);
});
test('destination saves validate full payload and route before passing through the user-token write boundary',async()=>{
 const value=newDestination(),body={action:'save',site,record:null,expectedRevision:null,type:'destination',path:'/destinations/new-destination',title:value.title,payload:value};
 const req=body=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
 let forwarded;assert.equal((await handleEditorCommand(req(body),async(...args)=>{forwarded=args;return {};})).status,200);assert.equal(forwarded[0],'a.b.c');assert.equal(forwarded[1],'save_draft');assert.deepEqual(forwarded[2].p_payload,value);
 for(const invalid of [{...body,path:'/journeys/new-destination'},{...body,payload:{title:'Legacy'}}]){let called=false;assert.equal((await handleEditorCommand(req(invalid),async()=>{called=true;})).status,422);assert.equal(called,false);}
});

test('destination readiness requires current media and published same-language related records',()=>{
 const ref='10000000-0000-4000-8000-000000000001';const image={assetId:'forest',alt:'Forest',decorative:false};
 const payload={...newDestination(),country:'India',description:'Description',intro:'Introduction',bestMonths:'Winter',image,heroImage:image,journeys:[{recordId:ref}]};
 const record={path:'/destinations/new-destination',payload,locale:'en'};
 const ready=validateDestinationDraft(record,[{assetId:'forest',available:true}],[{recordId:ref,type:'journey',available:true,published:true,locale:'en'}]);
 assert.deepEqual(ready.findings,[]);assert.equal(ready.contentChecksPass,true);assert.equal(ready.validatorVersion,'destination-1');
 const missing=validateDestinationDraft(record);assert.ok(missing.findings.some(f=>f.code==='asset_verification_required'));assert.ok(missing.findings.some(f=>f.code==='reference_unavailable'));
 const wrongLanguage=validateDestinationDraft(record,[{assetId:'forest',available:true}],[{recordId:ref,type:'journey',available:true,published:true,locale:'fr'}]);assert.ok(wrongLanguage.findings.some(f=>f.code==='reference_not_publishable'));
 const self=validateDestinationDraft({...record,id:ref,payload:{...payload,pairings:[{recordId:ref,title:'Self',reason:''}]}});assert.ok(self.findings.some(f=>f.code==='self_reference'));
});
test('destination advisory checks resolve stored references through caller-scoped RPCs only',async()=>{
 const record='10000000-0000-4000-8000-000000000001',revision='20000000-0000-4000-8000-000000000001',related='30000000-0000-4000-8000-000000000001';
 const payload={...newDestination(),journeys:[{recordId:related}]};
 const request=new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'validate',site,record,revision})});
 const calls=[];const response=await handleEditorCommand(request,async(token,name,args)=>{calls.push({token,name,args});if(name==='get_editor_record')return {id:record,currentRevision:revision,type:'destination',locale:'en',path:'/destinations/new-destination',payload};if(name==='get_record_media_status')return [];if(name==='resolve_editor_references')return [{id:related,available:false}];throw Error('Unexpected call');});
 assert.equal(response.status,200);const result=(await response.json()).result;assert.equal(result.publicationAuthorized,false);assert.ok(result.findings.some(f=>f.code==='reference_unavailable'));
 assert.ok(calls.every(call=>call.token==='a.b.c'));assert.deepEqual(calls.find(call=>call.name==='resolve_editor_references').args,{p_site:site,p_type:'journey',p_records:[related]});
});

test('destination readiness explains unsupported live locales and expedition links',()=>{
 const ref='10000000-0000-4000-8000-000000000001';
 const value=validateDestinationDraft({locale:'fr',path:'/destinations/new-destination',payload:{...newDestination(),expeditions:[{recordId:ref}]}},[],[{recordId:ref,type:'photoExpedition',available:true,published:true,locale:'fr'}]);
 assert.ok(value.findings.some(f=>f.code==='destination_locale_not_ready'));
 assert.ok(value.findings.some(f=>f.code==='expedition_delivery_not_ready'));
 assert.equal(value.contentChecksPass,false);
});
