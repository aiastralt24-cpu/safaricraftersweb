import test from 'node:test';import assert from 'node:assert/strict';import {newEvent} from '../lib/cms/events.ts';import {publishedEventMetadata,publishedEventStructuredData} from '../lib/cms/event-route.ts';
test('event metadata respects editorial overrides and global indexing defaults',()=>{
 const event={path:'/events/example',content:{...newEvent(),title:'Example event',summary:'Event summary'}};
 assert.equal(publishedEventMetadata(event).alternates.canonical,event.path);assert.equal(publishedEventMetadata(event).description,'Event summary');
 assert.equal(publishedEventMetadata(event,{titleTemplate:'%s | Example',description:'Default',indexing:'noindex'}).robots.index,false);
 event.content.seo={...event.content.seo,title:'SEO title',canonical:'https://example.test/event',indexing:'noindex',socialTitle:'Social title'};const metadata=publishedEventMetadata(event);assert.equal(metadata.title,'SEO title');assert.equal(metadata.openGraph.title,'Social title');assert.equal(metadata.robots.index,false);assert.equal(metadata.alternates.canonical,'https://example.test/event');assert.ok(!JSON.stringify(metadata).includes('internalNotes'));
});

test('event structured data preserves dates and attendance and does not invent ticketing facts',()=>{
 const event={path:'/events/example',content:{...newEvent(),title:'Event',organizer:'Named organizer',timing:{mode:'allDay',start:'2026-12-01',end:'2026-12-01'},venue:{name:'Venue',address:'Street',city:'City',region:'',country:'Country'},onlineUrl:'https://example.test/live'}};
 for(const [attendance,type] of [['inPerson','Offline'],['online','Online'],['hybrid','Mixed']]){event.content.attendance=attendance;const ld=publishedEventStructuredData(event,'https://example.test');assert.equal(ld.eventAttendanceMode,'https://schema.org/'+type+'EventAttendanceMode');assert.equal(ld.startDate,'2026-12-01');assert.equal(ld.endDate,'2026-12-01');assert.equal(ld.url,'https://example.test/events/example');assert.equal(Array.isArray(ld.location),attendance==='hybrid');assert.ok(!('offers' in ld));assert.ok(!('internalNotes' in ld));assert.ok(!('previousStartDate' in ld));assert.deepEqual(ld.organizer,{name:'Named organizer'});}
 for(const [status,schema] of [['scheduled','EventScheduled'],['postponed','EventPostponed'],['rescheduled','EventRescheduled'],['cancelled','EventCancelled']]){event.content.status=status;assert.equal(publishedEventStructuredData(event,'https://example.test').eventStatus,'https://schema.org/'+schema);}
 event.content.timing={mode:'timed',start:'2026-12-01T09:00:00+05:30',end:'2026-12-01T10:00:00+05:30'};assert.equal(publishedEventStructuredData(event,'https://example.test').startDate,event.content.timing.start);
});
