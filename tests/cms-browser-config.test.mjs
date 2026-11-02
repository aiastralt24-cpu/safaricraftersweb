import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCmsConfig} from '../lib/cms/browser-config.ts';
test('only public project keys can reach browser configuration',()=>{
 const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 assert.ok(publicCmsConfig('https://cms.test',jwt('anon')));assert.ok(publicCmsConfig('https://cms.test','sb_publishable_abcdefghijkl'));
 for(const key of [jwt('service_role'),jwt('authenticated'),'sb_secret_abcdefghijkl','broken',undefined])assert.equal(publicCmsConfig('https://cms.test',key),null);
});
test('browser configuration rejects credentials, redirects and missing setup',()=>{
 for(const url of [undefined,'http://cms.test','https://user:pass@cms.test','https://cms.test/path','https://cms.test?key=value'])assert.equal(publicCmsConfig(url,'sb_publishable_abcdefghijkl'),null);
});
