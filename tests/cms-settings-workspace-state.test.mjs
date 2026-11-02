import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedSettingsWorkspace} from '../lib/cms/settings-workspace-state.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const record={id,type:'settings',path:null,locale:'fr',currentRevision:other,publishedRevision:null,payload:{legacy:true},reviewStatus:'draft',history:[],permissions:{edit:true,submit:false,approve:false,publish:false}};
test('settings opening binds language and record while retaining authoritative configuration permissions',()=>{
 const value={record,canCreate:false,canConfigure:false};
 assert.deepEqual(verifiedSettingsWorkspace(value,'fr',id),value);
 assert.deepEqual(verifiedSettingsWorkspace({...value,record:null},'fr'),{...value,record:null});
 for(const bad of [{...value,record:null},{...value,record:{...record,id:other}},{...value,record:{...record,locale:'en'}},{...value,record:{...record,path:'/settings'}},{...value,canConfigure:undefined},{...value,canConfigure:'true'},{...value,record:{...record,permissions:{edit:true}}}])assert.throws(()=>verifiedSettingsWorkspace(bad,'fr',id),/could not be verified/);
 // A newer revision is legitimate; identity and current permission checks still apply.
 assert.equal(verifiedSettingsWorkspace({...value,record:{...record,currentRevision:id},canConfigure:true},'fr',id).canConfigure,true);
});
