import test from 'node:test';
import assert from 'node:assert/strict';
import {newDestination} from '../lib/cms/destinations.ts';
import {projectPublishedDestination} from '../lib/cms/published-destination.ts';
const id='10000000-0000-4000-8000-000000000001',revision='20000000-0000-4000-8000-000000000001',related='30000000-0000-4000-8000-000000000001';
const image={assetId:'forest',alt:'Forest',decorative:false};
const payload={...newDestination(),slug:'kanha',title:'Kanha',country:'India',description:'Forest guide',intro:'Sal forest',bestMonths:'Winter',image,heroImage:image,journeys:[{recordId:related}]};
const page={recordId:id,revisionId:revision,type:'destination',payload};
const reference={recordId:related,type:'journey',title:'Forest journey',path:'/journeys/forest',locale:'en',publishedRevisionId:revision};
test('destination visitor projection keeps editorial copy and resolves references without exposing raw relationship IDs',()=>{
 const result=projectPublishedDestination(page,'/destinations/kanha','en',[reference]);assert.equal(result.content.title,'Kanha');assert.deepEqual(result.journeys,[{title:'Forest journey',path:'/journeys/forest'}]);
 assert.equal('journeys' in result.content,false);assert.equal('pairings' in result.content,false);assert.equal('video' in result.content,false);assert.equal(result.revisionId,revision);assert.equal(payload.journeys[0].recordId,related);
});
test('destination projection fails closed for missing, duplicated, cross-language and unsafe related paths',()=>{
 for(const refs of [[],[reference,reference],[{...reference,locale:'fr'}],[{...reference,path:'/journeys/../../secret'}],[{...reference,path:'https://outside.test/path'}],[{...reference,type:'destination'}],[reference,{...reference,recordId:revision}]])assert.throws(()=>projectPublishedDestination(page,'/destinations/kanha','en',refs));
});
test('destination projection does not accept incomplete routes, unknown fields or unsupported videos',()=>{
 assert.throws(()=>projectPublishedDestination(page,'/destinations/wrong','en',[reference]));
 for(const value of [{...payload,country:''},{...payload,heroImage:undefined},{...payload,internalNote:'Hidden'},{...payload,video:{assetId:'film',poster:image,title:'Film',caption:'',transcript:''}}])assert.throws(()=>projectPublishedDestination({...page,payload:value},'/destinations/kanha','en',[reference]));
});
