import {z} from 'zod';
import {safeHref} from './composition.ts';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const visibility=z.object({visible:z.boolean().default(true),locales:z.array(z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)).max(30).default([]),regions:z.array(id).max(100).default([]),from:z.string().datetime({offset:true}).optional(),until:z.string().datetime({offset:true}).optional()}).strict().refine(v=>!v.from||!v.until||Date.parse(v.from)<Date.parse(v.until),'Visibility end must follow its start.');
const target=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('group')}).strict(),
 z.object({kind:z.literal('url'),href:safeHref,newWindow:z.boolean().default(false)}).strict(),
 z.object({kind:z.literal('record'),recordId:z.string().uuid(),contentType:z.enum(['page','destination','journey','photoExpedition','journalArticle','product','project']),newWindow:z.boolean().default(false)}).strict(),
]);
export const navigationItemSchema=z.object({id,parentId:id.nullable(),label:z.string().trim().min(1).max(100),description:z.string().max(1000).default(''),target,visibility,presentation:z.enum(['standard','mega']).default('standard'),featuredContent:z.array(z.object({recordId:z.string().uuid()}).strict()).max(6).default([])}).strict();
export const navigationSchema=z.object({schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),items:z.array(navigationItemSchema).max(200)}).strict().superRefine((menu,ctx)=>{
 const byId=new Map(menu.items.map(item=>[item.id,item]));
 const seen=new Set<string>();
 menu.items.forEach((item,index)=>{
  if(seen.has(item.id))ctx.addIssue({code:'custom',path:['items',index,'id'],message:'Menu item IDs must be unique.'});seen.add(item.id);
  let parent=item.parentId,depth=1;const ancestors=new Set([item.id]);
  while(parent!==null){
   if(ancestors.has(parent)){ctx.addIssue({code:'custom',path:['items',index,'parentId'],message:'Menu nesting must not contain cycles.'});break;}
   ancestors.add(parent);const node=byId.get(parent);
   if(!node){ctx.addIssue({code:'custom',path:['items',index,'parentId'],message:'Choose an existing parent item.'});break;}
   if(++depth>4){ctx.addIssue({code:'custom',path:['items',index,'parentId'],message:'Use at most four menu levels.'});break;}parent=node.parentId;
  }
 });
});
export type Navigation=z.infer<typeof navigationSchema>;
export type NavigationItem=z.infer<typeof navigationItemSchema>;
export type NavigationCommand={action:'insert';item:NavigationItem;index:number}|{action:'move';id:string;parentId:string|null;index:number}|{action:'remove';id:string};
/** Array order defines sibling order. Removing an item deliberately removes its subtree. */
export function editNavigation(input:unknown,command:NavigationCommand):Navigation{
 return navigationSchema.parse(editNavigationDraft(navigationSchema.parse(input),command));
}
export function editNavigationDraft(input:Navigation,command:NavigationCommand):Navigation{
 const menu=structuredClone(input);
 const original=command.action==='insert'?null:menu.items.find(item=>item.id===command.id);
 if(command.action!=='insert'&&!original)throw Error('Menu item not found.');
 if(command.action==='remove'){
  const removed=new Set([command.id]);let changed=true;
  while(changed){changed=false;for(const item of menu.items)if(item.parentId&&removed.has(item.parentId)&&!removed.has(item.id)){removed.add(item.id);changed=true;}}
  menu.items=menu.items.filter(item=>!removed.has(item.id));
 }else{
  const item=command.action==='insert'?structuredClone(command.item):{...original!,parentId:command.parentId};
  if(command.action==='move')menu.items=menu.items.filter(node=>node.id!==item.id);
  const siblings=menu.items.filter(node=>node.parentId===item.parentId);
  if(!Number.isInteger(command.index)||command.index<0||command.index>siblings.length)throw Error('Invalid menu position.');
  const before=siblings[command.index];const at=before?menu.items.findIndex(node=>node.id===before.id):menu.items.length;
  menu.items.splice(at,0,item);
 }
 navigationSchema.parse({...menu,title:'Draft',items:menu.items.map(item=>({id:item.id,parentId:item.parentId,label:'Item',target:{kind:'group'},visibility:{visible:true}}))});
 return menu;
}
export function visibleNavigationItems(menu:Navigation,context:{now:Date;locale:string;region?:string}):NavigationItem[]{
 const byId=new Map(menu.items.map(item=>[item.id,item])),visible=new Map<string,boolean>(),time=context.now.getTime();
 const check=(item:NavigationItem):boolean=>{
  if(visible.has(item.id))return visible.get(item.id)!;
  visible.set(item.id,false); // Fail closed even if a caller passes an unvalidated cycle.
  const v=item.visibility,result=Number.isFinite(time)&&v.visible&&(!v.from||time>=Date.parse(v.from))&&(!v.until||time<Date.parse(v.until))&&(!v.locales.length||v.locales.includes(context.locale))&&(!v.regions.length||Boolean(context.region&&v.regions.includes(context.region)))&&(item.parentId===null||Boolean(byId.get(item.parentId)&&check(byId.get(item.parentId)!)));
  visible.set(item.id,result);return result;
 };
 return menu.items.filter(check);
}
