import test from 'node:test';
import assert from 'node:assert/strict';
import {splitEventInstant,joinEventInstant,eventOffsetChoices} from '../lib/cms/event-time-input.ts';
import {eventTimingSchema} from '../lib/cms/events.ts';
test('event time controls preserve wall time, precision and imported offsets without browser conversion',()=>{
 for(const value of ['2026-12-01T09:00:00+05:30','2026-12-01T09:00:00Z','2026-12-01T09:00:00.123456-03:17']){
  const parts=splitEventInstant(value);assert.equal(joinEventInstant(parts.local,parts.offset),value);
 }
 assert.equal(joinEventInstant('','+05:30'),'');assert.equal(joinEventInstant('2026-12-01T09:00','+05:30'),'2026-12-01T09:00:00+05:30');
 assert.deepEqual(splitEventInstant('not a timestamp'),{local:'',offset:'+00:00'});
 assert.ok(eventOffsetChoices.includes('+05:45'));assert.ok(eventOffsetChoices.includes('+14:00'));assert.ok(eventOffsetChoices.includes('-12:00'));
});
test('event date controls retain strict instant ordering across daylight saving and inclusive all-day dates',()=>{
 const start=joinEventInstant('2026-11-01T01:45','-04:00'),end=joinEventInstant('2026-11-01T01:15','-05:00');
 assert.equal(eventTimingSchema.safeParse({mode:'timed',start,end}).success,true);
 assert.equal(eventTimingSchema.safeParse({mode:'timed',start:end,end:start}).success,false);
 assert.equal(eventTimingSchema.safeParse({mode:'allDay',start:'2028-02-29',end:'2028-02-29'}).success,true);
 assert.equal(eventTimingSchema.safeParse({mode:'allDay',start:'2027-02-29',end:'2027-02-29'}).success,false);
});
