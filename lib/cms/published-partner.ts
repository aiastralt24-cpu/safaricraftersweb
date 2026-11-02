import {z} from 'zod';
import {partnerSchema,partnerPath,partnerDraftFindings} from './partners.ts';
/** Strict visitor boundary: private fields must never reach the browser. */
export const publicPartnerContentSchema=partnerSchema.omit({relationships:true,internalNotes:true});
const card=z.object({type:z.enum(['application','location','certification','document']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,ctx)=>{
 const valid=value.type==='document'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.href):value.type==='application'?/^\/(?:applications|industries)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.href):new RegExp(`^/${value.type==='location'?'locations':'certifications'}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value.href);
 if(!valid)ctx.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});
});
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('partner'),path:z.string(),locale:z.literal('en'),payload:publicPartnerContentSchema,related:z.array(card).max(150).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedPartner(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.locale!==locale||value.path!==path||path!==partnerPath(d.slug))throw Error('Published partner identity mismatch.');
 if(value.related.some(item=>item.href===path))throw Error('Partner cannot relate to itself.');
 const findings=partnerDraftFindings({...d,internalNotes:'',relationships:{applications:[],products:[],locations:[],certifications:[],documents:[]}});
 if(findings.some(f=>f.severity==='error'))throw Error('Published partner is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related};
}
export type PublishedPartner=ReturnType<typeof projectPublishedPartner>;
