import {z} from 'zod';
const views={journey:'content',page:'pages',homepage:'homepage',settings:'settings',navigation:'menus',form:'forms',document:'documents',testimonial:'testimonials',specialist:'specialists',destination:'destinations',journalArticle:'journal',photoExpedition:'expeditions'} as const;
export function editorView(type:string){return Object.hasOwn(views,type)?views[type as keyof typeof views]:null;}
export type RequestedEditorRecord={id:string;locale:string};
export function verifyEditorTarget(input:unknown,target:RequestedEditorRecord&{type:string}){
 const value=z.object({id:z.string().uuid(),type:z.string(),locale:z.string(),currentRevision:z.string().uuid()}).passthrough().parse(input);
 if(value.id!==target.id||value.type!==target.type||value.locale!==target.locale)throw Error('The requested record changed or is unavailable. Refresh content health before opening it.');
 return value;
}
