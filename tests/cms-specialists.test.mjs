import test from 'node:test';
import assert from 'node:assert/strict';
import {newSpecialist,specialistSchema} from '../lib/cms/specialists.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const site='00000000-0000-4000-8000-000000000001';
const image={assetId:'portrait',alt:'Guide in a forest',decorative:false};
const complete=()=>({...newSpecialist(),name:'Forest Guide',role:'Naturalist',expertise:'Forest ecology',bio:'A field specialist.',planning:{label:'Plan with the guide',enquiryName:'Forest Guide'},image});
const record=payload=>({type:'specialist',path:null,locale:'en',payload});
const request=command=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(command)});
test('specialist reference checks require exact current type and language evidence without allowing publication',async()=>{
 const {validateSpecialistDraft}=await import('../lib/cms/specialists.ts');
 const draft={...complete(),journeys:[{recordId:site}]};const media=[{assetId:'portrait',available:true}];
 const available={recordId:site,available:true,type:'journey',locale:'en'};
 const ready=validateSpecialistDraft(record(draft),media,[available]);assert.deepEqual(ready.findings.map(f=>f.code),[]);assert.equal(ready.contentChecksPass,true);
 for(const evidence of [undefined,[],[{recordId:site,available:false}],[{...available,type:'photoExpedition'}],[{...available,locale:'fr'}],[available,available]])assert.ok(validateSpecialistDraft(record(draft),media,evidence).findings.some(f=>f.field==='journeys.0.recordId'));
 assert.ok(validateSpecialistDraft(record(draft),media,[available,{...available,recordId:'00000000-0000-4000-8000-000000000002'}]).findings.some(f=>f.code==='specialist_reference_evidence'));
});
test('trusted worker consumes specialist reference evidence for supported publication',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');let receipt;
 const target={site,record:'00000000-0000-4000-8000-000000000003',revision:site};
 const result=await runTrustedValidation(async(name,args)=>{
  if(name==='get_validation_input')return {...target,...record({...complete(),journeys:[{recordId:site}]}),mediaStatus:[{assetId:'portrait',available:true}],specialistStatus:[{recordId:site,available:true,type:'journey',locale:'en'}]};
  receipt=args;return null;
 },target);
 assert.equal(result.contentChecksPass,true);assert.equal(receipt.p_valid,true);assert.deepEqual(receipt.p_findings.map(item=>item.code),[]);
});
test('specialist drafts preserve directory fields and validate bounded explicit relationships',()=>{
 assert.equal(newSpecialist().visible,false);assert.ok(specialistSchema.safeParse(newSpecialist()).success);
 const draft={...complete(),kind:'team',moment:'A field note',visible:true,sortOrder:3,journeys:[{recordId:site}],video:{assetId:'film',title:'Field film',poster:image,caption:'Forest footage',transcript:'Spoken words',captionsAssetId:'captions'}};
 assert.deepEqual(specialistSchema.parse(draft),draft);
 for(const invalid of [{...draft,sortOrder:1.5},{...draft,bio:'a'.repeat(10001)},{...draft,journeys:[{recordId:site},{recordId:site}]},{...draft,video:{...draft.video,mp4:'https://unsafe.example/video'}},{...draft,html:'<script>'}])assert.equal(specialistSchema.safeParse(invalid).success,false);
});
test('specialist checks report missing copy, exact media evidence and supported delivery without mutation',()=>{
 const draft=complete(),before=structuredClone(draft);
 for(const evidence of [undefined,[],[{assetId:'portrait',available:false}],[{assetId:'portrait',available:true},{assetId:'portrait',available:false}]])assert.ok(validateStoredContent(record(draft),evidence).findings.some(f=>f.field==='image.assetId'));
 const result=validateStoredContent(record(draft),[{assetId:'portrait',available:true}]);assert.equal(result.contentChecksPass,true);assert.equal(result.validatorVersion,'specialist-1');assert.deepEqual(result.findings.map(f=>f.code),[]);assert.deepEqual(draft,before);
 const blank=validateStoredContent({...record(newSpecialist()),path:'/specialists/guide',locale:'fr'});
 for(const field of ['path','locale','role','expertise','bio','planning.label','planning.enquiryName','image'])assert.ok(blank.findings.some(f=>f.field===field),field);
 draft.video={assetId:'film',title:' ',poster:{...image,assetId:'poster'},caption:'',transcript:' ',captionsAssetId:'captions'};draft.expeditions=[{recordId:site}];
 const findings=validateStoredContent(record(draft),[{assetId:'portrait',available:true}]).findings;
 for(const field of ['video.poster.assetId','video.title','video.transcript','video','expeditions'])assert.ok(findings.some(f=>f.field===field),field);
});
test('specialist saves validate payload, null route and matching record name before persistence',async()=>{
 const command={action:'save',site,record:null,expectedRevision:null,type:'specialist',path:null,title:'Forest Guide',locale:'en',payload:complete()};let args;
 assert.equal((await handleEditorCommand(request(command),async(...input)=>{args=input;return {recordId:site};})).status,200);assert.equal(args[1],'save_draft');assert.deepEqual(args[2].p_payload,command.payload);
 for(const invalid of [{...command,path:'/specialists/guide'},{...command,title:'Other name'},{...command,payload:{name:'Only a name'}},{...command,payload:{...command.payload,privateScript:'bad'}}])assert.equal((await handleEditorCommand(request(invalid),async()=>assert.fail('Must not save invalid profile'))).status,422);
});
test('specialist advisory checks request nested media evidence for the saved revision',async()=>{
 const calls=[];const command={action:'validate',site,record:site,revision:site};
 const response=await handleEditorCommand(request(command),async(_token,name,args)=>{calls.push([name,args]);return name==='get_editor_record'?{id:site,currentRevision:site,...record(complete())}:name==='get_record_media_status'?[{assetId:'portrait',available:true}]:[];});
 assert.equal(response.status,200);assert.deepEqual(calls.map(v=>v[0]),['get_editor_record','get_record_media_status','get_specialist_reference_status']);assert.deepEqual(calls[1][1],{p_site:site,p_record:site,p_revision:site});assert.deepEqual((await response.json()).result.findings.map(f=>f.code),[]);
});

test('specialist save persists parsed image defaults required by public projection',async()=>{
 const payload={...complete(),image:{assetId:'portrait',alt:'Guide'}};let saved;
 const response=await handleEditorCommand(request({action:'save',site,record:null,expectedRevision:null,type:'specialist',path:null,title:payload.name,locale:'en',payload}),async(_token,name,args)=>{assert.equal(name,'save_draft');saved=args.p_payload;return {recordId:site};});
 assert.equal(response.status,200);assert.equal(saved.image.decorative,false);assert.deepEqual(saved,specialistSchema.parse(payload));
});
