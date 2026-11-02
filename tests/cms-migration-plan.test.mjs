import test from 'node:test';import assert from 'node:assert/strict';
import {planCmsMigrations} from '../lib/cms/migration-plan.ts';
const first={file:'001-foundation.sql',sha256:'a'.repeat(64)},second={file:'002-imports.sql',sha256:'b'.repeat(64)},third={file:'003-previews.sql',sha256:'c'.repeat(64)};
test('migration plan orders exact unapplied suffix and accepts completed ledger',()=>{
 assert.deepEqual(planCmsMigrations([third,first,second],[first]).pending,[second,third]);assert.deepEqual(planCmsMigrations([first,second],[]).pending,[first,second]);assert.equal(planCmsMigrations([first,second],[second,first]).valid,true);assert.deepEqual(planCmsMigrations([first],[first]).pending,[]);
});
test('migration plan blocks changed applied SQL, skipped predecessors and unknown migrations',()=>{
 for(const ledger of [[{...first,sha256:'d'.repeat(64)}],[second],[third]]){const plan=planCmsMigrations([first,second],ledger);assert.equal(plan.valid,false);assert.deepEqual(plan.pending,[]);}
});
test('migration plan rejects malformed or duplicate ledger identities and missing source files',()=>{
 for(const ledger of [null,{},[first,first],[first,{...first,file:'001-other.sql'}],[{...first,sha256:'invalid'}],[{...first,file:'../001-foundation.sql'}],[{...first,extra:'value'}]])assert.equal(planCmsMigrations([first],ledger).valid,false);
 for(const files of [[],[first,first],[first,third]])assert.equal(planCmsMigrations(files,[]).valid,false);
});
