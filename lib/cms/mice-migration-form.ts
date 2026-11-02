import {z} from 'zod';
const evidenceSchema=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid().nullable(),locale:z.string().nullable(),available:z.boolean()}).strict();
/** Only published identity evidence is returned; the private definition stays in SQL. */
export function verifyMiceMigrationForm(recordId:string,value:unknown){
 const evidence=evidenceSchema.parse(value);
 if(evidence.recordId!==recordId||evidence.available&&(!evidence.revisionId||evidence.locale!=='en'))throw Error('Corporate form evidence does not match the selected published form.');
 return evidence;
}
