import {z} from 'zod';
import {image} from './composition-media.ts';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),label=z.string().trim().min(1).max(200);
/** Concept menu supports ordinary local routes and HTTPS links, never script,
 * protocol-relative, encoded separators, credentials or ambiguous dot paths. */
export const conceptMenuHref=z.string().max(2048).refine(value=>{
 if(!value||/[\s\\\x00-\x1f]/.test(value)||/%(?:2f|5c|2e|00)/i.test(value))return false;
 if(value.startsWith('/')){if(value.startsWith('//'))return false;const url=new URL(value,'https://local.invalid');return url.pathname===value.split(/[?#]/)[0]&&!url.hash.includes('%');}
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
},'Choose a safe local route or HTTPS link.');
const link=z.object({label,href:conceptMenuHref,newWindow:z.boolean().default(false)}).strict();
export const conceptNavigationSchema=z.object({
 schemaVersion:z.literal(1),navigationLabel:label,contextLabel:label,openLabel:label,closeLabel:label,closeText:label,primaryLabel:label,secondaryLabel:label,cta:link,
 primary:z.array(link.extend({id,image})).min(1).max(12),secondary:z.array(link.extend({id})).max(20),
}).strict().superRefine((value,ctx)=>{
 const ids=new Set<string>();for(const key of ['primary','secondary'] as const)value[key].forEach((item,index)=>{if(ids.has(item.id))ctx.addIssue({code:'custom',path:[key,index,'id'],message:'Menu item IDs must be unique.'});ids.add(item.id);});
});
export type ConceptNavigation=z.infer<typeof conceptNavigationSchema>;
export function conceptMenuLinks(menu:ConceptNavigation){return [menu.cta,...menu.primary,...menu.secondary].map(item=>({label:item.label,href:item.href,newWindow:item.newWindow}));}

/** Deliberately incomplete starter: editors supply destinations and images. */
export function newConceptNavigation():ConceptNavigation{
 return {schemaVersion:1,navigationLabel:'Concept navigation',contextLabel:'',openLabel:'Open menu',closeLabel:'Close menu',closeText:'Close',primaryLabel:'Primary navigation',secondaryLabel:'More links',cta:{label:'',href:'',newWindow:false},primary:[],secondary:[]};
}
