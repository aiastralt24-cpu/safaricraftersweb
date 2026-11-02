import test from 'node:test';import assert from 'node:assert/strict';
import {parsePageTree} from '../lib/cms/page-tree.ts';
const [site,parent,id,revision,other]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const row={id,title:'Page',path:'/page',type:'page',revisionId:revision,parentRestricted:false,published:false,hasChildren:false},scope={site,locale:'en',parent,after:null};
const result={site,locale:'en',parentId:parent,snapshot:'a'.repeat(32),items:[row],nextCursor:null};
test('page tree verifies branch identity, order and pagination before display',()=>{
 assert.deepEqual(parsePageTree(result,scope),result);
 for(const patch of [{site:other},{locale:'fr'},{parentId:null},{items:[row,row]},{items:[{...row,id:parent}]},{items:[{...row,parentRestricted:true}]},{nextCursor:id}])assert.throws(()=>parsePageTree({...result,...patch},scope));
 assert.throws(()=>parsePageTree(result,{...scope,after:id}));
 assert.equal(parsePageTree({...result,parentId:null,items:[{...row,parentRestricted:true}]},{...scope,parent:null}).items[0].parentRestricted,true);
});
