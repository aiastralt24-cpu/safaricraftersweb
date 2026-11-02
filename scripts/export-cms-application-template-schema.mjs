import fs from 'node:fs/promises';
import {applicationTemplate,applicationContentFields} from '../lib/cms/application-import-contract.ts';
const recordId='application-example';
const samples={
 Pages:[{recordId,kind:'industry',operation:'create',slug:'example-industry',title:'Example industry',locale:'en'}],
 Content:[{recordId,field:'summary',value:'A fictional industry for learning the import workflow.'}],
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved page description.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Details'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...applicationTemplate,contentFields:applicationContentFields,samples},null,2));
