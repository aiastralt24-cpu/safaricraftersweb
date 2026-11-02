import {z} from 'zod';
const uuid=z.string().uuid();
export const monitorState=z.enum(['attention','pending','running','blocked','published','unpublished','cancelled','all']);
export const monitorOperation=z.enum(['all','publish','unpublish']);
export const scheduleMonitorQuery=z.object({site:uuid,after:uuid.optional(),state:monitorState.default('attention'),operation:monitorOperation.default('all')}).strict();
const row=z.object({id:uuid,record:uuid,revision:uuid,title:z.string(),type:z.string(),locale:z.string(),operation:z.enum(['publish','unpublish']),runAt:z.string().datetime({offset:true}),status:z.enum(['pending','running','blocked','published','unpublished','cancelled']),attempts:z.number().int().min(0).max(8),errorCode:z.string().nullable()}).strict();
const schema=z.object({websiteId:uuid,state:monitorState,operation:monitorOperation,items:z.array(row).max(20),nextCursor:uuid.nullable()}).strict();
export type ScheduleMonitor=z.infer<typeof schema>;
export function verifiedScheduleMonitor(input:unknown,query:z.infer<typeof scheduleMonitorQuery>){
 const value=schema.parse(input);if(value.websiteId!==query.site||value.state!==query.state||value.operation!==query.operation)throw Error('Schedule monitor response mismatch.');
 const ids=new Set<string>();let previous:z.infer<typeof row>|null=null;
 for(const item of value.items){
  if(ids.has(item.id)||item.id===query.after)throw Error('Schedule monitor duplicate record.');ids.add(item.id);
  if(query.operation!=='all'&&item.operation!==query.operation)throw Error('Schedule operation mismatch.');
  if(query.state!=='all'&&(query.state==='attention'?!['pending','running','blocked'].includes(item.status):item.status!==query.state))throw Error('Schedule status mismatch.');
  if(previous&&(Date.parse(item.runAt)<Date.parse(previous.runAt)||(Date.parse(item.runAt)===Date.parse(previous.runAt)&&item.id<=previous.id)))throw Error('Schedule ordering mismatch.');previous=item;
 }
 if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==value.items.at(-1)!.id))throw Error('Schedule cursor mismatch.');return value;
}
