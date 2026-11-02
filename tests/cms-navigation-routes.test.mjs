import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {publicNavigationPaths,navigationUrlStatus} from '../lib/cms/navigation-routes.ts';
import {validateNavigationDraft} from '../lib/cms/navigation-validation.ts';
import {projectPublishedNavigation} from '../lib/cms/published-navigation.ts';
test('navigation route inventory has real fixed public page sources and matches deployment SQL',async()=>{
 const sql=await fs.readFile(new URL('../database/cms/068-navigation-public-routes.sql',import.meta.url),'utf8');
 const values=[...sql.split('alter table')[0].matchAll(/\('(\/[^']*)'\)/g)].map(match=>match[1]);assert.deepEqual(values,publicNavigationPaths);
 for(const path of publicNavigationPaths){assert.doesNotMatch(path,/^\/(admin|cms|api|studio)(\/|$)/);await fs.access(new URL(`../app${path==='/'?'':path}/page.tsx`,import.meta.url));}
});
test('known internal routes and query variants pass; unknown paths, private surfaces and unverified anchors do not',()=>{
 for(const href of ['/','/contact','/search?q=forest','/store/books','https://partner.test/path'])assert.equal(navigationUrlStatus(href),'available',href);
 for(const href of ['/admin','/cms','/api/cms/content','/studio','/unknown','/journeys/unknown','/contact#unknown','#unknown','/contact/../admin','/%63ms'])assert.notEqual(navigationUrlStatus(href),'available',href);
 for(const href of ['javascript:alert(1)','//evil.test','/bad\\path','https://user:pass@host.test'])assert.equal(navigationUrlStatus(href),'invalid');
});
test('draft validation and public menu filtering share the fixed-route policy',()=>{
 const item=(id,href)=>({id,parentId:null,label:id,target:{kind:'url',href},visibility:{visible:true}});
 const payload={schemaVersion:1,title:'Menu',items:[item('contact','/contact'),item('admin','/admin')]};
 const result=validateNavigationDraft({type:'navigation',path:null,locale:'en',payload});assert.deepEqual(result.findings.filter(f=>f.code==='navigation_url_verification_required').map(f=>f.field),['items.1.target.href']);
 const uuid='00000000-0000-4000-8000-000000000001';const projected=projectPublishedNavigation({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:'en',payload,references:[]},{site:uuid,record:uuid,locale:'en'},{now:new Date()});assert.deepEqual(projected.items.map(item=>item.id),['contact']);
});
test('owned absolute URLs and verified layout anchors follow the internal route inventory',async()=>{
 for(const href of ['https://safaricrafters.com/contact','HTTPS://SAFARICRAFTERS.COM:443/contact','https://www.safaricrafters.com./search?q=forest#main','https://safaricrafters.com','https://safaricrafters.com?x=1','#main','/contact#main'])assert.equal(navigationUrlStatus(href),'available',href);
 for(const href of ['https://safaricrafters.com/admin','https://www.safaricrafters.com/api/cms/content','https://safaricrafters.com:8443/contact','https://admin.safaricrafters.com/','https://safaricrafters.com/unknown','https://safaricrafters.com/contact#unknown','https://safaricrafters.com/%63ms','https://%73afaricrafters.com/admin'])assert.notEqual(navigationUrlStatus(href),'available',href);
 const layout=await fs.readFile(new URL('../app/layout.tsx',import.meta.url),'utf8');assert.match(layout,/<main id="main">/);
});
