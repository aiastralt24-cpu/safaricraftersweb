import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedTranslationFamily} from '../lib/cms/translation-family.ts';import {handleTranslations} from '../lib/cms/translation-api.ts';
const [site,source,record,revision,other]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const entry={id:source,title:'Example',locale:'en',path:'/journeys/example',type:'journey',revision};
const family={recordId:record,source:entry,translations:[{...entry,id:record,locale:'fr',status:'unreviewed'}],nextCursor:null};
test('translation family verifies identities, privacy, ordering and pagination',()=>{
 assert.deepEqual(verifiedTranslationFamily(family,record),family);
 for(const value of [{...family,recordId:other},{...family,secret:'private'},{...family,nextCursor:record},{...family,translations:[...family.translations,...family.translations]},{...family,translations:[{...family.translations[0],id:source}]},{...family,translations:[{...family.translations[0],locale:'en'}]},{...family,translations:[{...family.translations[0],type:'page'}]},{...family,translations:[{...family.translations[0],payload:{private:'text'}}]}])assert.throws(()=>verifiedTranslationFamily(value,record),/could not be verified/);
 assert.throws(()=>verifiedTranslationFamily(family,record,record),/could not be verified/);
});
test('translation family API uses the caller token and never accepts a mismatched listing',async()=>{
 const body={action:'family',site,record,after:source},req=()=>new Request('https://cms.test/api/cms/translations',{method:'POST',headers:{Authorization:'Bearer actor.test.token','Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await handleTranslations(req(),async(token,name,args)=>{assert.equal(token,'actor.test.token');assert.equal(name,'get_translation_family');assert.deepEqual(args,{p_site:site,p_record:record,p_after:source});return family;});assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/private.*no-store/);assert.deepEqual(await result.json(),{result:family});
 assert.equal((await handleTranslations(req(),async()=>({...family,recordId:other}))).status,502);
});
