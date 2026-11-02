import test from 'node:test';import assert from 'node:assert/strict';
import {recoveryCallback,recoveryCode,recoveryStorage,recoveryStorageKey,passwordProblem} from '../lib/cms/password-recovery.ts';
test('recovery callback is fixed to the current permitted origin without a redirect target',()=>{
 assert.equal(recoveryCallback('https://cms.example.test'),'https://cms.example.test/cms/recover');assert.equal(recoveryCallback('http://localhost:3002'),'http://localhost:3002/cms/recover');
 for(const origin of ['http://public.test','https://user:pass@cms.test','https://cms.test/other','https://cms.test?next=x','javascript:alert(1)'])assert.throws(()=>recoveryCallback(origin));
});
test('recovery rejects implicit tokens, duplicate or unbounded codes and arbitrary return URLs',()=>{
 const base='https://cms.test/cms/recover';assert.equal(recoveryCode(base),null);assert.equal(recoveryCode(`${base}?code=${'a'.repeat(32)}`),'a'.repeat(32));
 for(const query of ['?code=short','?code='+('a'.repeat(513)),'?code='+('a'.repeat(32))+'&code=second','?next=https://evil.test','#access_token=secret','?error=expired'])assert.throws(()=>recoveryCode(base+query));
});
test('only PKCE verifier is persisted; recovery tokens cannot restore from persistent storage',()=>{
 const saved=new Map(),persistent={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const storage=recoveryStorage(persistent),verifier=`${recoveryStorageKey}-code-verifier`;
 storage.setItem(verifier,'proof/recovery');storage.setItem(recoveryStorageKey,'private-session');assert.equal(saved.has(recoveryStorageKey),false);assert.equal(storage.getItem(recoveryStorageKey),'private-session');
 const reloaded=recoveryStorage(persistent);assert.equal(reloaded.getItem(recoveryStorageKey),null);assert.equal(reloaded.getItem(verifier),'proof/recovery');reloaded.removeItem(verifier);assert.equal(saved.size,0);
});
test('password confirmation is exact, bounded and never trims the password',()=>{
 assert.equal(passwordProblem('long passphrase ','long passphrase '),null);assert.ok(passwordProblem('long passphrase ','long passphrase'));assert.ok(passwordProblem('short','short'));assert.ok(passwordProblem('x'.repeat(129),'x'.repeat(129)));
});
