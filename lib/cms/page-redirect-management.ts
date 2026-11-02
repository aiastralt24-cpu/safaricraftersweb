import {z} from 'zod';
import {isCustomPagePath} from './custom-page-path.ts';
const uuid=z.string().uuid(),path=z.string().refine(isCustomPagePath),version=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER-1);
export const redirectChange=z.object({site:uuid,record:uuid,sourcePath:path,version,enabled:z.boolean(),requestKey:uuid}).strict();
export type RedirectChange=z.infer<typeof redirectChange>;
const listing=z.object({site:uuid,recordId:uuid,path:z.string().nullable(),locale:z.string(),published:z.boolean(),snapshot:z.string().regex(/^[a-f0-9]{32}$/),items:z.array(z.object({sourcePath:path,enabled:z.boolean(),version}).strict()).max(50),nextCursor:path.nullable()}).strict();
export function parseRedirectList(value:unknown,scope:{site:string;record:string;after:string|null;snapshot:string|null}){
 const result=listing.parse(value);
 if(result.site!==scope.site||result.recordId!==scope.record||scope.after!==null&&result.snapshot!==scope.snapshot||result.items.some((row,i)=>row.sourcePath<=(i?result.items[i-1].sourcePath:scope.after??''))||result.nextCursor!==null&&(result.items.length!==50||result.nextCursor!==result.items.at(-1)?.sourcePath))throw Error('The redirect list changed or belongs to another page. Reload the list.');
 return result;
}
export function parseRedirectChange(value:unknown,command:RedirectChange){
 const result=redirectChange.omit({record:true}).extend({recordId:uuid,version:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).parse(value);
 if(result.site!==command.site||result.recordId!==command.record||result.sourcePath!==command.sourcePath||result.enabled!==command.enabled||result.requestKey!==command.requestKey||result.version!==command.version+1)throw Error('The redirect change was not confirmed. Retry the same request.');
 return result;
}
export const savedRedirectChange=redirectChange.extend({actor:uuid});
export type SavedRedirectChange=z.infer<typeof savedRedirectChange>;
export function redirectChangeStorageKey(scope:{actor:string;site:string;record:string}){return `cms-redirect-change:${uuid.parse(scope.actor)}:${uuid.parse(scope.site)}:${uuid.parse(scope.record)}`;}
export function parseSavedRedirectChange(raw:string,scope:{actor:string;site:string;record:string}){
 if(raw.length>8000)throw Error('Invalid saved redirect request.');
 const result=savedRedirectChange.parse(JSON.parse(raw));
 if(result.actor!==scope.actor||result.site!==scope.site||result.record!==scope.record)throw Error('The saved redirect request belongs to another account or page.');
 return result;
}
