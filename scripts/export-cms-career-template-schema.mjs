import fs from 'node:fs/promises';
import {careerTemplate,careerContentFields} from '../lib/cms/career-import-contract.ts';
const recordId='career-example';
const samples={
 Pages:[{recordId,operation:'create',slug:'example-guest-advisor',title:'Example guest advisor',locale:'en'}],
 Content:[['organization','Example organization'],['summary','Help guests plan their journeys.'],['employment','fullTime'],['workMode','remote'],['status','open'],['postedOn','2026-10-30'],['opensAt','2026-11-01T09:00:00+05:30'],['closesAt','2026-12-01T09:00:00+05:30']].map(([field,value])=>({recordId,field,value})),
 Blocks:[{recordId,itemId:'intro',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved job description.'},{recordId,itemId:'duties',position:2,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'help',position:1,blockId:'duties',text:'Help guests choose appropriate journeys.'}],
 RemoteRegions:[{recordId,itemId:'india',position:1,region:'India'}],
 Application:[{recordId,mode:'external',label:'Apply for this role',url:'https://example.test/apply'}],
 Compensation:[{recordId,currency:'INR',minimum:'40000.50',maximum:'60000',unit:'month'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...careerTemplate,contentFields:careerContentFields,samples},null,2));
