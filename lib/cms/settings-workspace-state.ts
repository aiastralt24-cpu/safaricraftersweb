import {z} from 'zod';
const settingsRecord=z.object({
 id:z.string().uuid(),type:z.literal('settings'),path:z.null(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
 currentRevision:z.string().uuid(),payload:z.unknown(),publishedRevision:z.string().uuid().nullable(),reviewStatus:z.string(),
 history:z.array(z.object({id:z.string().uuid(),createdAt:z.string()})),
 permissions:z.object({edit:z.boolean(),submit:z.boolean(),approve:z.boolean(),publish:z.boolean()}).passthrough(),
}).passthrough();
const workspace=z.object({record:settingsRecord.nullable(),canCreate:z.boolean(),canConfigure:z.boolean()});
/** Settings-specific permissions must come from the locale workspace, never a previously open language. */
export function verifiedSettingsWorkspace(value:unknown,locale:string,recordId?:string){
 const result=workspace.safeParse(value);
 if(!result.success||result.data.record&&result.data.record.locale!==locale||recordId&&result.data?.record?.id!==recordId)throw Error('Settings identity or permissions could not be verified. Reload the workspace.');
 return result.data;
}
