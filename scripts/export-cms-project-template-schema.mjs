// Export the authoritative contract and a synthetic, equivalent Word/Excel example.
import fs from 'node:fs/promises';
import {projectTemplate,projectContentFields} from '../lib/cms/project-import-contract.ts';
const recordId='project-example',claim='11111111-1111-4111-8111-111111111111';
const samples={
 Pages:[{recordId,operation:'create',slug:'forest-restoration',title:'Forest restoration',locale:'en'}],
 Content:[{recordId,field:'kind',value:'caseStudy'},{recordId,field:'summary',value:'A synthetic example for testing the project import template.'}],
 Blocks:['body','challenge','approach','outcomes'].map((section,index)=>({recordId,itemId:`paragraph-${index}`,position:1,section,kind:'paragraph',text:`Example ${section} text.\nSecond line remains intact.`})),
 Claims:[{recordId,itemId:claim,position:1,statement:'Example statement requiring independent review.',approvalContact:'Example reviewer'}],
 Evidence:[{recordId,itemId:'evidence-1',position:1,claimId:claim,targetId:'22222222-2222-4222-8222-222222222222'}],
 Relationships:[{recordId,itemId:'related-1',position:1,group:'documents',targetId:'22222222-2222-4222-8222-222222222222'}],
};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...projectTemplate,contentFields:projectContentFields,samples},null,2));
