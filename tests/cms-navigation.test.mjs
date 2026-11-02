import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationSchema,editNavigation,visibleNavigationItems} from '../lib/cms/navigation.ts';
const item=(id,parentId=null)=>({id,parentId,label:id,target:{kind:'group'},visibility:{visible:true}});
const menu=()=>navigationSchema.parse({schemaVersion:1,title:'Main menu',items:[item('explore'),item('journeys','explore'),item('about')]});
test('menu schema rejects cycles, dangling parents, excess depth, duplicate IDs and unsafe URLs',()=>{
 const bad=[[item('a','a')],[item('a','b'),item('b','a')],[item('a','missing')],[item('a'),item('a')],Array.from({length:5},(_,i)=>item(`i${i}`,i?`i${i-1}`:null))];
 for(const items of bad)assert.equal(navigationSchema.safeParse({schemaVersion:1,title:'Menu',items}).success,false);
 const unsafe=item('a');unsafe.target={kind:'url',href:'javascript:alert(1)'};assert.equal(navigationSchema.safeParse({schemaVersion:1,title:'Menu',items:[unsafe]}).success,false);
});
test('moves preserve identities, child relationships, sibling order and original input',()=>{
 const original=menu(),before=structuredClone(original);
 const moved=editNavigation(original,{action:'move',id:'about',parentId:'explore',index:0});assert.deepEqual(moved.items.filter(i=>i.parentId==='explore').map(i=>i.id),['about','journeys']);assert.deepEqual(original,before);
 assert.throws(()=>editNavigation(original,{action:'move',id:'explore',parentId:'journeys',index:0}),/cycles/);
 assert.deepEqual(editNavigation(original,{action:'remove',id:'explore'}).items.map(i=>i.id),['about']);
 assert.throws(()=>editNavigation(original,{action:'move',id:'about',parentId:null,index:50}),/position/);
});
test('hidden or unavailable ancestor suppresses descendants and end dates are exclusive',()=>{
 const parsed=menu();parsed.items[0].visibility={visible:true,locales:['en'],regions:['india'],from:'2026-11-01T00:00:00Z',until:'2026-12-01T00:00:00Z'};
 const context={now:new Date('2026-11-01T00:00:00Z'),locale:'en',region:'india'};
 assert.deepEqual(visibleNavigationItems(parsed,context).map(i=>i.id),['explore','journeys','about']);
 for(const change of [{region:undefined},{locale:'fr'},{now:new Date('2026-12-01T00:00:00Z')}])assert.deepEqual(visibleNavigationItems(parsed,{...context,...change}).map(i=>i.id),['about']);
});

test('local draft operations permit incomplete destinations without accepting invalid nesting',async()=>{
 const {editNavigationDraft}=await import('../lib/cms/navigation.ts');const draft=menu();draft.items[1].target={kind:'record',recordId:'',contentType:'page',newWindow:false};assert.equal(navigationSchema.safeParse(draft).success,false);
 assert.deepEqual(editNavigationDraft(draft,{action:'remove',id:'explore'}).items.map(i=>i.id),['about']);
 assert.throws(()=>editNavigationDraft(draft,{action:'move',id:'explore',parentId:'journeys',index:0}),/cycles/);
});
