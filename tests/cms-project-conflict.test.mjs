import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,projectSchema} from '../lib/cms/projects.ts';import {prepareProjectConflict} from '../lib/cms/project-conflict.ts';import {resolveDraftConflict} from '../lib/cms/draft-conflict.ts';
const base={id:'project',type:'project',path:'/projects/new-case-study',locale:'en',currentRevision:'one',payload:newProject(),permissions:{edit:true}};
test('project reconciliation preserves independent changes and requires explicit grouped-field decisions',()=>{
 const mine={...base.payload,summary:'Local summary',claims:[{id:'00000000-0000-4000-8000-000000000001',statement:'Local claim',evidence:[],approvalContact:'',reviewOn:''}]};
 const remote={...base.payload,client:'Server client',claims:[{...mine.claims[0],statement:'Server claim'}]},latest={...base,currentRevision:'two',payload:remote};const c=prepareProjectConflict(base,mine,latest);
 assert.throws(()=>resolveDraftConflict(c.base,c.mine,c.remote,{}),/Choose which claims/);const merged=projectSchema.parse(resolveDraftConflict(c.base,c.mine,c.remote,{claims:'latest'}));assert.equal(merged.summary,'Local summary');assert.equal(merged.client,'Server client');assert.equal(merged.claims[0].statement,'Server claim');
 const image={assetId:'image',alt:'Photo',decorative:false},withImage={...base,payload:{...base.payload,image}};const removed=prepareProjectConflict(withImage,base.payload,{...withImage,currentRevision:'two',payload:{...withImage.payload,client:'Changed'}});assert.equal(projectSchema.parse(resolveDraftConflict(removed.base,removed.mine,removed.remote,{})).image,undefined);
});
test('project conflicts reject changed identity, revoked edit access and incompatible content without overwriting',()=>{
 const latest={...base,currentRevision:'two'};for(const patch of [{id:'other'},{type:'page'},{path:'/projects/other'},{locale:'fr'},{permissions:{edit:false}},{currentRevision:'one'},{payload:{...base.payload,slug:'other'}}])assert.throws(()=>prepareProjectConflict(base,base.payload,{...latest,...patch}));assert.throws(()=>prepareProjectConflict(base,{...base.payload,slug:'other'},latest));
});
