import test from 'node:test';import assert from 'node:assert/strict';
import {careerWindowState} from '../lib/cms/career-display.ts';
const job={status:'open',opensAt:'2026-10-30T10:00:00+05:30',closesAt:'2026-10-30T11:00:00+05:30'},opens=Date.parse(job.opensAt),closes=Date.parse(job.closesAt);
test('visitor career status observes opening/closing instants, administrative pauses and invalid data',()=>{
 assert.equal(careerWindowState(job,opens-1),'scheduled');assert.equal(careerWindowState(job,opens),'open');assert.equal(careerWindowState(job,closes-1),'open');assert.equal(careerWindowState(job,closes),'closed');
 assert.equal(careerWindowState({...job,status:'paused'},opens),'paused');assert.equal(careerWindowState({...job,status:'closed'},opens-1),'closed');assert.equal(careerWindowState({...job,status:'paused'},closes),'closed');assert.equal(careerWindowState({...job,opensAt:'',closesAt:''},opens),'open');
 for(const value of [{...job,opensAt:'bad'},{...job,closesAt:job.opensAt},{...job,status:'invalid'},null])assert.equal(careerWindowState(value,opens),'unavailable');assert.equal(careerWindowState(job,NaN),'unavailable');
});
