import {z} from 'zod';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image,heroFraming,imageFocalPoint} from './composition-media.ts';
const text=(max:number)=>z.string().min(1).max(max).refine(value=>Boolean(value.trim()),'Enter visible content.');
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const unique=<T extends {id:string}>(items:T[])=>new Set(items.map(item=>item.id)).size===items.length;
/** The planning intent is an explicit allowlist entry. Publication must separately
 * check destinations, rights and trusted evidence; valid data is not authority. */
export const aviationLinkSchema=z.object({label:text(30),href:z.string().max(2048).refine(value=>{
 if(value==='/plan?experience=private-aviation')return true;
 if(/^#[a-z][a-z0-9-]*$/.test(value)||/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/.test(value))return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\\x00-\x1f]/.test(value);}catch{return false;}
},'Use a local path, anchor, approved aviation planning link or HTTPS URL.'),newWindow:z.boolean().default(false)}).strict();
const media=z.object({image,mobileImage:image.optional(),desktopFraming:heroFraming,mobileFraming:heroFraming}).strict();
const titles={eyebrow:text(200),heading:editorialHeadingSchema};
const paragraphs=z.array(z.object({id,text:text(10000)}).strict()).min(1).max(30).refine(unique,'Paragraph IDs must be unique.');
const steps=z.array(z.object({id,title:text(200),copy:text(4000)}).strict()).min(1).max(20).refine(unique,'Step IDs must be unique.');
const videoFraming=imageFocalPoint.extend({shape:z.enum(['panorama','landscape','wide','square','portrait'])}).strict();
const heroMedia=z.object({poster:image,mobilePoster:image.optional(),background:z.discriminatedUnion('kind',[
 z.object({kind:z.literal('image')}).strict(),
 z.object({kind:z.literal('video'),desktopAssetId:id,mobileAssetId:id.optional()}).strict(),
]),desktopFraming:videoFraming,mobileFraming:videoFraming}).strict();
const specifications=z.array(z.object({id,label:text(100),value:text(500)}).strict()).min(1).max(20).refine(unique,'Specification IDs must be unique.');
/** Source-preserving field contracts only. Composition registration does not authorize
 * publication. No HTML, remote media URLs or arbitrary playback attributes. */
export const aviationSectionSchemas={
 aviationHero:z.object({...titles,copy:text(4000),button:aviationLinkSchema,media:heroMedia,captions:z.object({primary:text(200),secondary:text(200),showSecondaryOnMobile:z.boolean()}).strict()}).strict(),
 aviationIntroduction:z.object({...titles,paragraphs,button:aviationLinkSchema,sequenceLabel:text(300),steps}).strict(),
 aviationFleet:z.object({...titles,introduction:text(10000),aircraft:z.array(z.object({id,name:text(200),type:text(200),summary:text(4000),media,specifications}).strict()).min(1).max(20).refine(unique,'Aircraft IDs must be unique.'),sourceNote:text(4000)}).strict(),
 aviationJourney:z.object({...titles,media,steps}).strict(),
 aviationServices:z.object({...titles,introduction:text(10000),items:steps}).strict(),
} as const;
export type AviationSectionKind=keyof typeof aviationSectionSchemas;
export const aviationSectionKinds=Object.keys(aviationSectionSchemas) as AviationSectionKind[];
export type AviationSectionData<K extends AviationSectionKind>=z.infer<(typeof aviationSectionSchemas)[K]>;
