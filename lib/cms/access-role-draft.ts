import {z} from 'zod';
export const accessActions=['view','create','edit','submit','approve','publish','export','delete','configure'] as const;
export const accessModules=['*','page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project','lead','access'] as const;
export const accessPermissionSchema=z.object({action:z.enum(accessActions),contentType:z.enum(accessModules),recordId:z.string().uuid().transform(value=>value.toLowerCase()).nullable()}).strict().superRefine((value,ctx)=>{
 if(value.contentType==='access'&&(value.action!=='configure'||value.recordId!==null))ctx.addIssue({code:'custom',message:'Access administration requires configure with all records.'});
 if(value.action==='create'&&value.recordId!==null)ctx.addIssue({code:'custom',message:'Create cannot be restricted to an existing record.'});
});
export type AccessPermission=z.infer<typeof accessPermissionSchema>;
const key=(value:AccessPermission)=>JSON.stringify([value.action,value.contentType,value.recordId?.toLowerCase()??null]);
export const accessRoleDraftSchema=z.object({name:z.string().trim().min(1).max(100).regex(/^[^\x00-\x1f\x7f]*$/),permissions:z.array(accessPermissionSchema).max(200)}).strict().superRefine((value,ctx)=>{
 const seen=new Set<string>();value.permissions.forEach((permission,index)=>{const id=key(permission);if(seen.has(id))ctx.addIssue({code:'custom',path:['permissions',index],message:'Remove this duplicate permission.'});seen.add(id);});
});
export function permissionChanges(before:AccessPermission[],after:AccessPermission[]){
 const oldKeys=new Set(before.map(key)),newKeys=new Set(after.map(key));
 return {added:after.filter(value=>!oldKeys.has(key(value))),removed:before.filter(value=>!newKeys.has(key(value)))};
}
