import {z} from 'zod';
import {retentionCommands} from './enquiry-file-retention.ts';
const save=retentionCommands.options[1];
const pendingSchema=z.object({actor:z.string().uuid(),command:save}).strict();
export type PendingRetentionSave=z.infer<typeof pendingSchema>;
export function retentionSaveKey(actor:string,site:string){z.string().uuid().parse(actor);z.string().uuid().parse(site);return `cms-retention-save:${actor}:${site}`;}
export function readRetentionSave(storage:Pick<Storage,'getItem'>,actor:string,site:string){
 const text=storage.getItem(retentionSaveKey(actor,site));if(text===null)return null;if(text.length>8000)throw Error('Retention save recovery is invalid.');const value=pendingSchema.parse(JSON.parse(text));if(value.actor!==actor||value.command.site!==site)throw Error('Retention save recovery belongs to another account or website.');return value;
}
export function retainRetentionSave(storage:Pick<Storage,'getItem'|'setItem'>,input:PendingRetentionSave){
 const value=pendingSchema.parse(input),old=readRetentionSave(storage,value.actor,value.command.site);if(old&&JSON.stringify(old)!==JSON.stringify(value))throw Error('Resolve the previous retention save first.');
 const key=retentionSaveKey(value.actor,value.command.site),text=JSON.stringify(value);if(text.length>8000)throw Error('Retention save recovery is too large.');storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('Retention save recovery could not be retained.');return value;
}
export function clearRetentionSave(storage:Pick<Storage,'getItem'|'removeItem'>,input:PendingRetentionSave){
 const old=readRetentionSave(storage,input.actor,input.command.site);if(!old)return;if(JSON.stringify(old)!==JSON.stringify(input))throw Error('Retention save recovery changed.');const key=retentionSaveKey(input.actor,input.command.site);storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Retention save recovery could not be cleared.');
}
