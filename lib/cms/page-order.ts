import {z} from 'zod';
const uuid=z.string().uuid(),locale=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),version=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const pageOrderScope=z.object({site:uuid,locale,parent:uuid.nullable()}).strict();
const ids=z.array(uuid).max(500).refine(value=>new Set(value).size===value.length,'Page IDs must be unique.');
export const pageOrderCommand=z.discriminatedUnion('action',[
 pageOrderScope.extend({action:z.literal('read')}),
 pageOrderScope.extend({action:z.literal('save'),snapshot:z.string().regex(/^[a-f0-9]{32}$/),ids,requestKey:uuid}),
]);
export const pageOrderState=z.object({site:uuid,locale,parentId:uuid.nullable(),version,snapshot:z.string().regex(/^[a-f0-9]{32}$/),items:z.array(z.object({id:uuid,title:z.string(),path:z.string().nullable(),revisionId:uuid,hierarchyVersion:version}).strict()).max(500)}).strict();
export type PageOrderState=z.infer<typeof pageOrderState>;
export function parsePageOrder(value:unknown,scope:z.infer<typeof pageOrderScope>){
 const state=pageOrderState.parse(value);
 if(state.site!==scope.site||state.locale!==scope.locale||state.parentId!==scope.parent||new Set(state.items.map(item=>item.id)).size!==state.items.length||state.items.some(item=>item.id===scope.parent))throw Error('The page order does not match this branch. Refresh before ordering.');return state;
}
export function parsePageOrderResult(value:unknown,command:Extract<z.infer<typeof pageOrderCommand>,{action:'save'}>){
 const result=z.object({site:uuid,locale,parentId:uuid.nullable(),version,orderedIds:ids,requestKey:uuid}).strict().parse(value);
 if(result.site!==command.site||result.locale!==command.locale||result.parentId!==command.parent||result.requestKey!==command.requestKey||JSON.stringify(result.orderedIds)!==JSON.stringify(command.ids)||result.version<1)throw Error('The page order save response does not match the request. Refresh to check the saved order.');return result;
}
