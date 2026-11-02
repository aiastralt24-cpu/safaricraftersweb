import fs from 'node:fs/promises';
import {partnerTemplate,partnerContentFields} from '../lib/cms/partner-import-contract.ts';
const recordId='partner-example';
const samples={
 Pages:[{recordId,kind:'dealer',operation:'create',slug:'example-partner',title:'Example partner',locale:'en'}],
 Content:[{recordId,field:'summary',value:'A fictional partner for learning the import workflow.'},{recordId,field:'contact.phone',value:'0012345678'},{recordId,field:'contact.email',value:'partner@example.test'},{recordId,field:'status',value:'active'}],
 Services:[{recordId,itemId:'repairs',position:1,text:'Repairs'},{recordId,itemId:'installation',position:2,text:'Installation'}],
 Coverage:[{recordId,itemId:'india',position:1,countryCode:'IN'},{recordId,itemId:'kenya',position:2,countryCode:'KE'}],
 Regions:[{recordId,itemId:'gujarat',position:1,coverageId:'india',text:'Gujarat'}],
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved description.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Details'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...partnerTemplate,contentFields:partnerContentFields,samples},null,2));
