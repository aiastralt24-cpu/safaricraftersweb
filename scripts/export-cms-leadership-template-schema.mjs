import fs from 'node:fs/promises';
import {leadershipTemplate,leadershipContentFields} from '../lib/cms/leadership-import-contract.ts';
const recordId='leadership-example';
const samples={
 Pages:[{recordId,operation:'create',slug:'example-leader',title:'Example leader',locale:'en'}],
 Content:[{recordId,field:'role',value:'Example director'},{recordId,field:'department',value:'Example team'},{recordId,field:'status',value:'current'},{recordId,field:'sortOrder',value:'9'},{recordId,field:'summary',value:'A fictional profile for learning the leadership import workflow.'}],
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved biography.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Responsibilities'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
 Links:[{recordId,itemId:'contact',position:1,label:'Contact our team',href:'/contact'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...leadershipTemplate,contentFields:leadershipContentFields,samples},null,2));
