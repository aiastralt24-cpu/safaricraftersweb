import fs from 'node:fs/promises';
import {newsTemplate,newsContentFields} from '../lib/cms/news-import-contract.ts';
const recordId='news-example';
const samples={
 Pages:[{recordId,operation:'create',slug:'example-news-update',title:'Example news update',locale:'en'}],
 Content:[{recordId,field:'kind',value:'pressRelease'},{recordId,field:'summary',value:'A synthetic example for learning the News import workflow.'},{recordId,field:'author',value:'Example editorial team'},{recordId,field:'date',value:'2026-10-29'},{recordId,field:'dateline',value:'Example location'}],
 Blocks:[{recordId,itemId:'opening',position:1,kind:'paragraph',text:'This is sample content only.\nReplace it with an approved update.'},{recordId,itemId:'next',position:2,kind:'heading',level:'h2',text:'Next steps'},{recordId,itemId:'steps',position:3,kind:'list',ordered:'false'}],
 ListItems:[{recordId,itemId:'review',position:1,blockId:'steps',text:'Review every proposed change before saving.'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...newsTemplate,contentFields:newsContentFields,samples},null,2));
