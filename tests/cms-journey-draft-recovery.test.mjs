import test from 'node:test';import assert from 'node:assert/strict';
import {parseJourneyRecoveryDraft} from '../lib/cms/journey-draft-recovery.ts';
const value={title:'Journey',slug:'field-guide',intro:{blocks:['Retained']},itinerary:[{itemId:'day-1',position:1,title:'Arrival',extra:{stay:'Camp'}}],custom:{nested:['Keep']}};
test('journey recovery retains structured and unseen fields without rewriting collections',()=>{
 assert.deepEqual(parseJourneyRecoveryDraft(value,'/journeys/field-guide'),value);
});
test('journey recovery rejects wrong route, malformed collections and invalid titles',()=>{
 assert.throws(()=>parseJourneyRecoveryDraft(value,'/journeys/other'),/URL/);
 assert.throws(()=>parseJourneyRecoveryDraft({...value,itinerary:[...value.itinerary,...value.itinerary]},'/journeys/field-guide'),/IDs/);
 assert.throws(()=>parseJourneyRecoveryDraft({...value,media:{}},'/journeys/field-guide'),/repair/);
 assert.throws(()=>parseJourneyRecoveryDraft({...value,title:''},'/journeys/field-guide'));
});
