import test from 'node:test';import assert from 'node:assert/strict';
import {recoverNewProjectDraft} from '../lib/cms/project-new-draft.ts';import {newProject} from '../lib/cms/projects.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,actor=id(1),site=id(2),value={version:1,scope:{actor,site,kind:'project'},id:id(3),locale:'en',draft:newProject(),createdAt:'2026-10-29T00:00:00.000Z',updatedAt:'2026-10-29T00:00:00.000Z'};
test('new project recovery preserves structured drafts and refuses mismatched private-copy scope',()=>{
 assert.deepEqual(recoverNewProjectDraft(value,actor,site),{payload:newProject(),locale:'en'});
 for(const scope of [{...value.scope,actor:id(4)},{...value.scope,site:id(4)},{...value.scope,kind:'page'}])assert.throws(()=>recoverNewProjectDraft({...value,scope},actor,site));
 for(const patch of [{locale:'../en'},{draft:{...value.draft,approved:true}},{draft:{...value.draft,slug:'../escape'}},{updatedAt:'2026-10-28T00:00:00.000Z'}])assert.throws(()=>recoverNewProjectDraft({...value,...patch},actor,site));
});
