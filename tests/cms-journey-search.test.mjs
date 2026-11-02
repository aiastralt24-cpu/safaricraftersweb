import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedJourneySearchItems} from '../lib/cms/journey-search.ts';
import {filterSiteSearch} from '../lib/site-search.ts';
const journey={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/journeys/forest',modifiedAt:'2026-10-22T10:00:00Z',slug:'forest',title:'Forest journey',description:'Discover quiet tiger country.',region:'India',duration:'Five days',bestMonths:'Winter',hero:null};
test('search indexes only supplied published journeys, including season and description',()=>{
 const items=publishedJourneySearchItems([journey]);assert.equal(items[0].href,journey.path);
 for(const query of [' WINTER ','tiger','five days','india','forest'])assert.equal(filterSiteSearch(items,query,'Journey').length,1);
 assert.deepEqual(filterSiteSearch(items,'winter','Journal'),[]);assert.deepEqual(publishedJourneySearchItems([]),[]);
 assert.ok(!JSON.stringify(items).includes(journey.revisionId));
});
test('search retains other collections without reviving removed journey entries',()=>{
 const journal={title:'Winter field notes',href:'/journal/winter',type:'Journal',detail:'Field notes'};
 const before=[...publishedJourneySearchItems([journey]),journal],after=[...publishedJourneySearchItems([]),journal];
 assert.equal(filterSiteSearch(before,'winter','All').length,2);assert.deepEqual(filterSiteSearch(after,'winter','All'),[journal]);assert.deepEqual(filterSiteSearch(after,'','Journey'),[]);assert.deepEqual(after,[journal]);
});
