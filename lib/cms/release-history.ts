import {z} from 'zod';
const uuid=z.string().uuid();
export const releaseHistorySchema=z.array(z.object({release:uuid,request:uuid,createdAt:z.iso.datetime({offset:true}),status:z.enum(['committed','cancelled']),recordCount:z.number().int().min(1).max(50)}).strict()).max(20).superRefine((rows,ctx)=>{
 if(new Set(rows.map(row=>row.release)).size!==rows.length||new Set(rows.map(row=>row.request)).size!==rows.length)ctx.addIssue({code:'custom',message:'Duplicate release history.'});
});
