import test from 'node:test';import assert from 'node:assert/strict';
import {compareTranslationRecords,loadTranslationComparison} from '../lib/cms/translation-comparison.ts';
const [record,revision,source,sourceRevision,site,other]=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const status={recordId:record,revisionId:revision,locale:'fr',sourceRecordId:source,sourceLocale:'en',sourceRevisionId:sourceRevision,currentSourceRevisionId:sourceRevision,reviewedRevisionId:null,status:'unreviewed'};
const saved=(id=source,payload={})=>({id,currentRevision:id===source?sourceRevision:revision,type:'journey',locale:id===source?'en':'fr',title:'Example',path:'/journeys/example',payload,history:[{private:'Excluded history'}],permissions:{approve:true}});
test('translation comparison includes all saved fields, types, missing values and list order without private metadata',()=>{
 const a={copy:'<script>not executed</script>',blank:'',nil:null,enabled:false,n:0,list:[{heading:'First'},{heading:'Second'}],empty:[],group:{},sourceOnly:'Present'},b={copy:'Translated copy',blank:'Empty text',nil:'No value',enabled:true,n:'0',list:[{heading:'Second'},{heading:'First'}],empty:[],group:{},targetOnly:'Added'};
 const result=compareTranslationRecords(status,saved(source,a),saved(record,b));assert.equal(result.fields.length,13);assert.ok(result.fields.every(f=>!f.label.includes('history')&&!f.label.includes('permissions')));
 const field=name=>result.fields.find(f=>f.label==='content › '+name);
 assert.equal(field('blank').equal,false);assert.equal(field('nil').equal,false);assert.equal(field('n').equal,false);assert.equal(field('empty').equal,true);assert.equal(field('group').equal,true);assert.equal(field('source Only').translation.kind,'missing');assert.equal(field('target Only').source.kind,'missing');assert.equal(field('list › Item 1 › heading').source.text,'First');assert.equal(field('copy').source.text,'<script>not executed</script>');
});
test('translation comparison rejects mismatched record, revision, language, type and excessive complexity',()=>{
 for(const patch of [{id:other},{currentRevision:other},{locale:'de'},{type:'page'}])assert.throws(()=>compareTranslationRecords(status,saved(),{...saved(record),...patch}),/changed/);
 let deep='leaf';for(let i=0;i<35;i++)deep={child:deep};assert.throws(()=>compareTranslationRecords(status,saved(source,{deep}),saved(record)),/too complex/);
 assert.throws(()=>compareTranslationRecords(status,saved(source,{many:Array.from({length:20001},()=>1)}),saved(record)),/too complex/);
});
test('translation comparison verifies status again after authorized reads and rejects intervening source changes',async()=>{
 const calls=[];const api=async(path,options)=>{calls.push({path,options});if(options)return {result:status};return {record:saved(new URL(path,'https://cms.test').searchParams.get('record'))};};
 assert.equal((await loadTranslationComparison(api,site,status)).fields.length,3);assert.equal(calls.length,3);assert.ok(calls.slice(0,2).every(c=>c.path.includes(`site=${site}`)));assert.equal(JSON.parse(calls[2].options.body).action,'read');
 await assert.rejects(loadTranslationComparison(async(path,options)=>options?{result:{...status,currentSourceRevisionId:other,status:'source_changed'}}:api(path),site,status),/changed while loading/);
 await assert.rejects(loadTranslationComparison(async()=>{throw Error('Permission revoked');},site,status),/Permission revoked/);
});
