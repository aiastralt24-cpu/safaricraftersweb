import fs from 'node:fs/promises';
import {eventTemplate,eventContentFields} from '../lib/cms/event-import-contract.ts';
const recordId='event-example';
const samples={
 Pages:[{recordId,operation:'create',slug:'example-event-update',title:'Example event update',locale:'en'}],
 Content:Object.entries({summary:'A synthetic example for learning the Event import workflow.',organizer:'Example organizer',category:'Workshop',attendance:'online',onlineUrl:'https://example.test/event','timing.mode':'allDay','timing.start':'2026-12-01','timing.end':'2026-12-01','registration.enabled':'false'}).map(([field,value])=>({recordId,field,value})),
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved update.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Next steps'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...eventTemplate,contentFields:eventContentFields,samples},null,2));
