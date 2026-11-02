import test from 'node:test';import assert from 'node:assert/strict';
import {editorView,verifyEditorTarget} from '../lib/cms/editor-target.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('editor targets map all implemented families and refuse unsupported or inherited keys',()=>{
 for(const [type,view] of Object.entries({journey:'content',page:'pages',homepage:'homepage',settings:'settings',navigation:'menus',form:'forms',document:'documents',testimonial:'testimonials',specialist:'specialists',destination:'destinations',journalArticle:'journal',photoExpedition:'expeditions'}))assert.equal(editorView(type),view);
 for(const type of ['product','project','sharedSection','__proto__','constructor','toString'])assert.equal(editorView(type),null);
});
test('opening health records requires exact record family and language but loads a newer saved revision',()=>{
 const target={id:id(1),type:'page',locale:'fr'},record={...target,currentRevision:id(2),payload:{}};assert.equal(verifyEditorTarget(record,target).currentRevision,id(2));
 for(const value of [null,{...record,id:id(3)},{...record,type:'homepage'},{...record,locale:'en'},{...record,currentRevision:null}])assert.throws(()=>verifyEditorTarget(value,target));
});
