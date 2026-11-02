import test from 'node:test';
import assert from 'node:assert/strict';
import {accessRoleDraftSchema,permissionChanges} from '../lib/cms/access-role-draft.ts';
const p={action:'view',contentType:'journey',recordId:null};
test('role drafts reject ambiguous or ineffective permission scopes',()=>{
 for(const permissions of [[p,p],[{...p,contentType:'access'}],[{...p,action:'create',recordId:'10000000-0000-4000-8000-000000000001'}],[{...p,recordId:'invalid'}]])assert.equal(accessRoleDraftSchema.safeParse({name:'Agency',permissions}).success,false);
 assert.deepEqual(accessRoleDraftSchema.parse({name:' Agency ',permissions:[]}),{name:'Agency',permissions:[]});
 assert.equal(accessRoleDraftSchema.safeParse({name:'Access',permissions:[{action:'configure',contentType:'access',recordId:null}]}).success,true);
});
test('review separates additions and removals, ignoring order and UUID letter case',()=>{
 const scoped={...p,recordId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},edit={...p,action:'edit'};
 assert.deepEqual(permissionChanges([p,scoped],[{...scoped,recordId:scoped.recordId.toUpperCase()},edit]),{added:[edit],removed:[p]});
 assert.deepEqual(permissionChanges([p,edit],[edit,p]),{added:[],removed:[]});
});
