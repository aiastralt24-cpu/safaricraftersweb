import {z} from 'zod';

const uuid=z.string().uuid();
/** A schedule pins an immutable revision, including withdrawals. Never interpret
 * a withdrawal as permission to remove whatever happens to be live later. */
export const publicationScheduleSchema=z.object({
 site:uuid,record:uuid,revision:uuid,
 operation:z.enum(['publish','unpublish']),
 runAt:z.iso.datetime({offset:true}),
}).strict();
export type PublicationSchedule=z.infer<typeof publicationScheduleSchema>;

/** Require an explicit offset: a browser's ambiguous DST/local time must be
 * resolved by the scheduling UI before it reaches this boundary. The database
 * must independently check its own clock when accepting the request. */
export function parseFuturePublicationSchedule(input:unknown,now:Date){
 const request=publicationScheduleSchema.parse(input);
 if(!Number.isFinite(now.getTime()))throw new Error('Invalid scheduling clock.');
 const instant=Date.parse(request.runAt);
 if(!Number.isFinite(instant)||instant<=now.getTime())throw new Error('Schedule must be in the future.');
 return {...request,runAt:new Date(instant).toISOString()};
}

export const claimedPublicationSchedulesSchema=z.array(publicationScheduleSchema.extend({
 id:uuid,token:uuid,
}).strict()).max(50).superRefine((jobs,ctx)=>{
 const seen=new Set<string>();
 for(const job of jobs){
  if(seen.has(job.id))ctx.addIssue({code:'custom',message:'Duplicate claimed schedule.'});
  seen.add(job.id);
 }
});
