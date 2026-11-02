import {z} from 'zod';
const uuid=z.string().uuid();
export const pageTreeResponse=z.object({site:uuid,locale:z.string(),parentId:uuid.nullable(),snapshot:z.string().regex(/^[a-f0-9]{32}$/),items:z.array(z.object({id:uuid,title:z.string(),path:z.string().nullable(),type:z.enum(['page','homepage']),revisionId:uuid,parentRestricted:z.boolean(),published:z.boolean(),hasChildren:z.boolean()}).strict()).max(50),nextCursor:uuid.nullable()}).strict();
export type PageTreeItem=z.infer<typeof pageTreeResponse>['items'][number];
export function parsePageTree(value:unknown,scope:{site:string;locale:string;parent:string|null;after:string|null;snapshot?:string|null}){
 const result=pageTreeResponse.parse(value);
 if(scope.after&&(!scope.snapshot||result.snapshot!==scope.snapshot)||result.site!==scope.site||result.locale!==scope.locale||result.parentId!==scope.parent||result.items.some((item,i)=>item.id===(scope.parent??'')||item.id===scope.after||result.items.findIndex(other=>other.id===item.id)!==i||Boolean(scope.parent&&item.parentRestricted))||result.nextCursor!==null&&(result.items.length!==50||result.nextCursor!==result.items.at(-1)?.id))throw Error('The page tree response does not match this branch. Refresh the tree.');
 return result;
}
