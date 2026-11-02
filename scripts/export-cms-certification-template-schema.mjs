import fs from 'node:fs/promises';
import {certificationTemplate,certificationContentFields} from '../lib/cms/certification-import-contract.ts';
const recordId='certification-example';
const samples={Pages:[{recordId,operation:'create',slug:'example-certification',title:'Example certification',locale:'en'}],Content:[['certificateNumber','000123'],['issuedOn','2026-10-30'],['statement','Example claim only.\nReplace with the exact approved wording.']].map(([field,value])=>({recordId,field,value}))};
if(!process.argv[2])throw Error('Pass an output JSON path.');
await fs.writeFile(process.argv[2],JSON.stringify({...certificationTemplate,contentFields:certificationContentFields,samples},null,2));
