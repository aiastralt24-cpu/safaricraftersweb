import test from 'node:test';import assert from 'node:assert/strict';
import {localizedRequest,visitorRequestHeaders,cmsPathHeader,requiresDocumentNavigation} from '../lib/cms/localized-request.ts';
test('visitor language derives from the verified namespace and internal header overwrites client input',()=>{
 assert.deepEqual(localizedRequest('/languages/fr/notre-histoire'),{locale:'fr',path:'/notre-histoire'});
 assert.deepEqual(localizedRequest('/languages/pt-BR/our-story'),{locale:'pt-BR',path:'/our-story'});
 for(const path of ['/languages/en/our-story','/languages/FR/our-story','/languages/fr/cms','/languages/fr/../cms','/languages/fr//story','/languages/fr/%63ms','/languages/fr','/about'])assert.equal(localizedRequest(path),null,path);
 const incoming=new Headers({[cmsPathHeader]:'/languages/fr/notre-histoire',accept:'text/html'}),clean=visitorRequestHeaders(incoming,'/about');assert.equal(clean.get(cmsPathHeader),'/about');assert.equal(clean.get('accept'),'text/html');assert.equal(incoming.get(cmsPathHeader),'/languages/fr/notre-histoire');
 assert.equal(requiresDocumentNavigation('/about','/contact'),false);assert.equal(requiresDocumentNavigation('/about','/languages/fr/our-story'),true);assert.equal(requiresDocumentNavigation('/languages/fr/our-story','/about'),true);
});
test('localized maintenance preserves document language without the English announcement caption',async()=>{
 const {readMaintenanceMessage,maintenanceResponse}=await import('../lib/cms/maintenance.ts');
 const {newGlobalSettings}=await import('../lib/cms/global-settings.ts');const id='00000000-0000-4000-8000-000000000001',payload=newGlobalSettings();payload.errors.maintenance={enabled:true,title:'Maintenance',body:'Nous revenons bientôt.'};
 const env={CMS_MAINTENANCE_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const message=await readMaintenanceMessage(env,async(url,init)=>{assert.equal(JSON.parse(init.body).p_locale,'fr');return Response.json({websiteId:id,recordId:id,revisionId:id,locale:'fr',payload});},'fr');
 const response=maintenanceResponse(message,'GET','fr'),html=await response.text();assert.equal(response.status,503);assert.match(html,/<html lang="fr">/);assert.ok(html.includes('Nous revenons bientôt.'));assert.ok(!html.includes('PLEASE CHECK BACK SOON'));assert.equal(await maintenanceResponse(message,'HEAD','fr').text(),'');
});
