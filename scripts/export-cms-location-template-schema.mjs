import fs from 'node:fs/promises';
import {locationTemplate,locationContentFields} from '../lib/cms/location-import-contract.ts';
const recordId='location-example';
const samples={
 Pages:[{recordId,kind:'office',operation:'create',slug:'example-office',title:'Example office',locale:'en'}],
 Content:[{recordId,field:'summary',value:'A fictional office for learning the import workflow.'},{recordId,field:'address.locality',value:'Mumbai'},{recordId,field:'address.countryCode',value:'IN'},{recordId,field:'address.postalCode',value:'00123'},{recordId,field:'timeZone',value:'Asia/Kolkata'},{recordId,field:'visiting',value:'appointmentOnly'},{recordId,field:'contact.email',value:'office@example.test'}],
 AddressLines:[{recordId,itemId:'street',position:1,text:'12 Example Street'}],
 Hours:[{recordId,itemId:'monday',position:1,day:'1',closed:'false',opens:'09:00',closes:'17:00'},{recordId,itemId:'sunday',position:2,day:'7',closed:'true'}],
 Coordinates:[{recordId,latitude:'0',longitude:'72.8'}],
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved page description.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Details'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...locationTemplate,contentFields:locationContentFields,samples},null,2));
