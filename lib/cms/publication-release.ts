import {z} from 'zod';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
export const releaseManifestSchema=z.object({
 site:uuid,request:uuid,
 items:z.array(z.object({record:uuid,revision:uuid}).strict()).min(1).max(50),
}).strict().superRefine((value,context)=>{
 if(new Set(value.items.map(item=>item.record)).size!==value.items.length)
  context.addIssue({code:'custom',path:['items'],message:'Each record may appear only once in a release.'});
});
export type ReleaseManifest=z.infer<typeof releaseManifestSchema>;
const receiptSchema=z.object({release:uuid,request:uuid,items:z.array(z.object({record:uuid,revision:uuid,deliveryJob:uuid}).strict()).min(1).max(50)}).strict();
/** A valid receipt proves an accepted transaction, never current visibility or
 * cache completion. Preserve manifest order because it encodes dependencies. */
export function parseReleaseReceipt(input:unknown,manifest:ReleaseManifest){
 const expected=releaseManifestSchema.parse(manifest),receipt=receiptSchema.parse(input);
 if(receipt.request!==expected.request||receipt.items.length!==expected.items.length||receipt.items.some((item,index)=>item.record!==expected.items[index].record||item.revision!==expected.items[index].revision)||new Set(receipt.items.map(item=>item.deliveryJob)).size!==receipt.items.length)
  throw new Error('Release receipt identity mismatch.');
 return receipt;
}

export function parseReleaseCancellation(input:unknown,manifest:ReleaseManifest){
 const expected=releaseManifestSchema.parse(manifest);
 const committed=z.object({status:z.literal('committed'),result:z.unknown()}).strict().safeParse(input);
 if(committed.success)return {status:'committed' as const,result:parseReleaseReceipt(committed.data.result,expected)};
 const cancelled=z.object({status:z.literal('cancelled'),site:uuid,request:uuid,items:z.array(z.object({record:uuid,revision:uuid}).strict()).min(1).max(50)}).strict().parse(input);
 if(cancelled.site!==expected.site||cancelled.request!==expected.request||JSON.stringify(cancelled.items)!==JSON.stringify(expected.items))throw Error('Cancellation identity mismatch.');
 return cancelled;
}
