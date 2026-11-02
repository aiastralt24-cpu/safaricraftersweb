import {tanzaniaSectionSchemas} from './tanzania-country-sections.ts';
import {kenyaSectionSchemas} from './kenya-country-sections.ts';
import {miceSectionSchemas} from './mice-content.ts';
import {aviationSectionSchemas} from './private-aviation-content.ts';
import {guidedSectionSchemas} from './guided-safaris-content.ts';
import {contactContentSchema} from './contact-content.ts';
import {conservationContentSchema} from './conservation-content.ts';
import {editorialCopySchema} from './editorial-copy.ts';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image,heroFraming,imageFocalPoint} from './composition-media.ts';
import {homepageHeroSchema} from './homepage-hero.ts';
import {headingEmphasisMatches} from './heading-emphasis.ts';
import {expeditionDirectorySectionSchema} from './expedition-directory-section.ts';
import {z} from 'zod';
import {emailHref} from './inline-text.ts';

const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const text=z.string().max(50000);
const heading=z.string().min(1).max(200);
export const safeHref=z.string().max(2048).refine(value=>{
  if(/[\s\\\x00-\x1f]/.test(value)) return false;
  if(/^\/(?!\/)/.test(value) || /^#[a-z][a-z0-9-]*$/.test(value)) return true;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;} catch{return false;}
},'Use a relative site path, anchor, or HTTPS URL without credentials.');
export const link=z.object({label:z.string().min(1).max(30),href:safeHref,newWindow:z.boolean().default(false)}).strict();
export {image,heroFraming} from './composition-media.ts';
export type {HeroFraming} from './composition-media.ts';
const reference=z.object({recordId:z.string().uuid()}).strict();
export const inlineSpan=z.object({text,href:z.union([safeHref,emailHref]).optional(),bold:z.boolean().optional(),italic:z.boolean().optional(),script:z.enum(['normal','superscript','subscript']).optional()}).strict();
export const paragraph=z.object({kind:z.literal('paragraph'),text,spans:z.array(inlineSpan).min(1).max(200).optional()}).strict().refine(value=>!value.spans||value.spans.map(span=>span.text).join('')===value.text,'Inline text must match the full paragraph.');
export const richTable=z.object({kind:z.literal('table'),caption:z.string().trim().min(1).max(500),headers:z.array(z.string().trim().min(1).max(200)).min(1).max(8),rows:z.array(z.array(z.string().max(5000)).min(1).max(8)).min(1).max(50)}).strict().refine(value=>value.rows.every(row=>row.length===value.headers.length),'Every row must match the column count.');
export const richList=z.object({kind:z.literal('list'),ordered:z.boolean(),items:z.array(text).min(1).max(50),itemSpans:z.array(z.array(inlineSpan).min(1).max(200).nullable()).min(1).max(50).optional()}).strict().refine(value=>!value.itemSpans||(value.itemSpans.length===value.items.length&&value.itemSpans.every((spans,index)=>!spans||spans.map(span=>span.text).join('')===value.items[index])),'List formatting must match each complete item in order.');
export const richText=z.array(z.discriminatedUnion('kind',[
  paragraph,
  z.object({kind:z.literal('quote'),text:z.string().trim().min(1).max(50000),attribution:z.string().max(500).optional()}).strict(),
  richTable,
  richList,
  z.object({kind:z.literal('link'),label:heading,href:safeHref,style:z.enum(['text','button']).optional()}).strict()
])).max(200);
export type SectionImage=z.infer<typeof image>;
export type RichText=z.infer<typeof richText>;
export type SectionLink=z.infer<typeof link>;
const identified=<T extends z.ZodRawShape>(shape:T)=>z.object({id,...shape}).strict();
const cards=z.array(identified({portrait:z.object({shape:z.enum(['tall','square']),x:z.number().min(0).max(100),y:z.number().min(0).max(100)}).strict().optional(),eyebrow:z.string().max(200).optional(),title:heading,copy:text,image:image.optional(),link:link.optional()})).max(50);
const sources=z.object({mode:z.enum(['manual','query']),records:z.array(reference).max(100),contentType:z.enum(['destination','journey','photoExpedition','journalArticle','product','project']),limit:z.number().int().min(1).max(50),order:z.enum(['manual','newest','title'])}).strict()
  .refine(value=>value.mode!=='manual'||value.records.length>0,'Select at least one record.');

/** Field contracts for all initial PRD component families. Rendering/migration
 * readiness is tracked separately; a valid schema does not imply a live renderer. */
export const sectionDataSchemas={
  ...kenyaSectionSchemas,
  ...tanzaniaSectionSchemas,
  ...miceSectionSchemas,
  ...guidedSectionSchemas,
  ...aviationSectionSchemas,
  contactIntro:contactContentSchema.shape.intro,
  contactEnquiry:contactContentSchema.shape.enquiry,
  conservationHero:conservationContentSchema.shape.hero,
  conservationIntro:conservationContentSchema.shape.intro,
  conservationImpact:conservationContentSchema.shape.impact,
  conservationRecords:conservationContentSchema.shape.fieldRecords,
  conservationFootprint:conservationContentSchema.shape.footprint,
  homepageHero:homepageHeroSchema,
  homepageGuestNotes:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,button:link,cardActionLabel:z.string().min(1).max(30),previousLabel:heading,nextLabel:heading,items:z.array(z.object({recordId:z.string().uuid(),image,href:safeHref}).strict()).min(1).max(100)}).strict().refine(value=>new Set(value.items.map(item=>item.recordId)).size===value.items.length,'Choose each guest note only once.'),
  homepageDepartures:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,button:link,cardActionLabel:z.string().min(1).max(30),boardLabel:heading,emptyMessage:z.string().min(1).max(2000),overrides:z.array(z.object({recordId:z.string().uuid(),title:heading,location:heading}).strict()).max(100)}).strict().refine(value=>new Set(value.overrides.map(item=>item.recordId)).size===value.overrides.length,'Each expedition can have only one display override.'),
  homepageJourneys:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,introduction:z.string().max(2000),button:link,cardActionLabel:z.string().min(1).max(30),items:z.array(z.object({recordId:z.string().uuid(),kicker:heading}).strict()).min(1).max(12)}).strict().refine(value=>new Set(value.items.map(item=>item.recordId)).size===value.items.length,'Choose each journey only once.'),
  homepageAviation:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,copy:z.string().max(2000),benefitsLabel:heading,benefits:z.array(identified({text:heading})).min(1).max(12),button:link,image,desktopFraming:heroFraming.optional(),mobileFraming:heroFraming.optional()}).strict(),
  homepageCorporate:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,paragraphs:z.array(identified({text:z.string().min(1).max(2000)})).min(1).max(10),formats:z.array(identified({label:heading,title:heading,href:safeHref})).min(1).max(12),button:link,mainImage:image,insetImage:image,mainFocalPoint:imageFocalPoint.optional(),mainMobileFocalPoint:imageFocalPoint.optional(),insetFocalPoint:imageFocalPoint.optional(),insetMobileFocalPoint:imageFocalPoint.optional()}).strict(),
  homepagePartners:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,defaultRegionId:id,regions:z.array(identified({label:heading,items:z.array(identified({name:heading,image})).min(1).max(100)})).min(1).max(20)}).strict().refine(value=>value.regions.some(region=>region.id===value.defaultRegionId),'The default partner region must exist.'),
  homepageJourneyTypes:z.object({heading:editorialHeadingSchema,items:z.array(identified({heading:editorialHeadingSchema,copy:editorialCopySchema,image,link})).min(1).max(12)}).strict(),
  homepageConcierge:z.object({heading:editorialHeadingSchema,prompt:editorialHeadingSchema,choices:z.array(identified({link})).min(1).max(12),contact:link}).strict(),
  homepageStory:z.object({eyebrow:z.string().max(200),heading:editorialHeadingSchema,copy:text,button:link,ledgerTitle:heading,statistics:z.array(identified({value:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),suffix:z.string().max(12),label:heading,source:z.string().max(2000)})).min(1).max(12)}).strict(),
  hero:z.object({layout:z.enum(['split','overlay']).optional(),eyebrow:text.optional(),title:heading,titleAccent:heading.optional(),copy:text,desktop:image,mobile:image.optional(),desktopFraming:heroFraming.optional(),mobileFraming:heroFraming.optional(),buttons:z.array(link).max(2)}).strict().refine(headingEmphasisMatches,{path:['titleAccent'],message:'Emphasized words must occur exactly in the heading.'}),
  text:z.object({layout:z.enum(['stacked','split']).optional(),eyebrow:z.string().max(200).optional(),title:heading.optional(),titleAccent:heading.optional(),body:richText}).strict().refine(value=>value.layout!=='split'||Boolean(value.title?.trim()),{path:['title'],message:'A split text section needs a heading.'}).refine(headingEmphasisMatches,{path:['titleAccent'],message:'Emphasized words must occur exactly in the heading.'}),
  imageText:z.object({eyebrow:z.string().max(200).optional(),title:heading,titleAccent:heading.optional(),body:richText,image,desktopFraming:heroFraming.optional(),mobileFraming:heroFraming.optional(),button:link.optional()}).strict().refine(headingEmphasisMatches,{path:['titleAccent'],message:'Emphasized words must occur exactly in the heading.'}),
  gallery:z.object({title:heading.optional(),images:z.array(identified({image})).min(1).max(50)}).strict(),
  video:z.object({title:heading,assetId:id,poster:image,transcript:text,captionsAssetId:id}).strict(),
  cards:z.object({layout:z.enum(['grid','numbered','leadership']).optional(),introduction:text.optional(),eyebrow:z.string().max(200).optional(),title:heading,titleAccent:heading.optional(),items:cards,columns:z.union([z.literal(2),z.literal(3),z.literal(4)])}).strict().refine(value=>value.layout!=='leadership'||(value.items.length>0&&value.items.every(item=>item.image&&item.eyebrow?.trim()&&item.title.trim()&&item.copy.trim())),{path:['items'],message:'Each leadership profile needs a name, role, biography and portrait.'}).refine(value=>value.layout==='leadership'||value.items.every(item=>!item.portrait),{path:['items'],message:'Portrait presentation requires the leadership layout.'}).refine(value=>value.layout!=='numbered'||value.items.every(item=>!item.image),{path:['items'],message:'Numbered principles do not use images. Remove item images or choose the grid layout.'}).refine(headingEmphasisMatches,{path:['titleAccent'],message:'Emphasized words must occur exactly in the heading.'}),
  productListing:z.object({title:heading,source:sources}).strict(),
  productComparison:z.object({title:heading,products:z.array(reference).min(2).max(6),attributes:z.array(heading).min(1).max(30)}).strict(),
  statistics:z.object({title:heading.optional(),items:z.array(identified({value:heading,label:heading,unit:text.optional(),source:text,disclaimer:text.optional()})).min(1).max(12)}).strict(),
  testimonials:z.object({title:heading,records:z.array(reference).min(1).max(20)}).strict(),
  projects:z.object({title:heading,source:sources}).strict(),
  timeline:z.object({title:heading,items:z.array(identified({date:heading,title:heading,copy:text,image:image.optional()})).min(1).max(100)}).strict(),
  reusableLeadership:z.object({title:heading,records:z.array(reference).min(1).max(30).refine(rows=>new Set(rows.map(r=>r.recordId.toLowerCase())).size===rows.length,'Select each leadership profile once.')}).strict(),
  reusableFaq:z.object({title:heading,records:z.array(reference).min(1).max(50).refine(rows=>new Set(rows.map(r=>r.recordId.toLowerCase())).size===rows.length,'Select each FAQ once.')}).strict(),
  faq:z.object({title:heading,items:z.array(identified({question:heading,answer:richText})).min(1).max(50)}).strict(),
  tabs:z.object({title:heading,defaultTabId:id,items:z.array(identified({label:heading,body:richText})).min(1).max(12)}).strict().refine(value=>value.items.some(item=>item.id===value.defaultTabId),'Default tab must be an existing tab.'),
  downloads:z.object({title:heading.refine(value=>Boolean(value.trim()),'Enter a download heading.'),items:z.array(identified({label:heading.refine(value=>Boolean(value.trim()),'Enter a download label.'),document:reference,versionId:z.string().uuid()})).min(1).max(50)}).strict(),
  cta:z.object({eyebrow:z.string().max(200).optional(),title:heading,titleAccent:heading.optional(),copy:text,buttons:z.array(link).min(1).max(2)}).strict().refine(headingEmphasisMatches,{path:['titleAccent'],message:'Emphasized words must occur exactly in the heading.'}),
  form:z.object({title:heading,introduction:text,form:reference,successMessage:text}).strict(),
  logos:z.object({title:heading.optional(),items:z.array(identified({image,label:heading,href:safeHref.optional()})).min(1).max(30)}).strict(),
  locations:z.object({title:heading,display:z.enum(['list','map']),items:z.array(identified({name:heading,address:text,latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),contact:text})).min(1).max(50)}).strict(),
  related:z.object({title:heading,source:sources}).strict(),
  expeditionDirectory:expeditionDirectorySectionSchema,
  specialistDirectory:z.object({title:heading,relatedHeading:z.string().trim().min(1).max(200),emptyMessage:z.string().trim().min(1).max(2000)}).strict(),
} as const;
export type SectionKind=keyof typeof sectionDataSchemas;
const controls=z.object({
  label:heading,visible:z.boolean().default(true),anchor:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/).optional(),
  background:z.enum(['paper','white','forest','ink']).default('paper'),
  kenyaOverrides:z.object({background:z.boolean().optional(),mediaAlign:z.boolean().optional(),mobileOrder:z.boolean().optional()}).strict().optional(),
  tanzaniaOverrides:z.object({background:z.boolean().optional(),mediaAlign:z.boolean().optional(),mobileOrder:z.boolean().optional()}).strict().optional(),
  width:z.enum(['reading','content','full']).default('content'),spacing:z.enum(['compact','standard','generous']).default('standard'),
  textAlign:z.enum(['start','center']).default('start'),mediaAlign:z.enum(['start','end']).default('end'),
  mobileOrder:z.enum(['textFirst','mediaFirst']).default('textFirst'),headingLevel:z.enum(['h1','h2','h3']).default('h2'),
  animation:z.enum(['none','fade','reveal']).default('none'),
  visibleFrom:z.string().datetime({offset:true}).optional(),visibleUntil:z.string().datetime({offset:true}).optional(),
  locales:z.array(z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)).max(30).default([]),regions:z.array(id).max(100).default([])
}).strict().refine(value=>!value.visibleFrom||!value.visibleUntil||Date.parse(value.visibleFrom)<Date.parse(value.visibleUntil),'Visibility end must follow its start.');
const sectionEnvelope=z.object({id,kind:z.string(),controls,data:z.unknown()}).strict();
const pageSchema=z.object({schemaVersion:z.literal(1),title:heading,sections:z.array(sectionEnvelope).max(100)}).strict();
export type Composition=z.infer<typeof pageSchema>;
export type CompositionIssue={path:string;message:string};
export function validateComposition(input:unknown):{valid:boolean;issues:CompositionIssue[];page?:Composition} {
  const parsed=pageSchema.safeParse(input);
  if(!parsed.success)return {valid:false,issues:parsed.error.issues.map(issue=>({path:issue.path.join('.'),message:issue.message}))};
  const page=parsed.data,issues:CompositionIssue[]=[];
  const ids=new Set<string>(),anchors=new Set<string>();
  let h1=0;
  page.sections.forEach((section,index)=>{
    const path=`sections.${index}`;
    if(section.controls.kenyaOverrides&&!Object.hasOwn(kenyaSectionSchemas,section.kind))issues.push({path:`${path}.controls.kenyaOverrides`,message:'Source-layout overrides are only supported on Kenya sections.'});
    if(section.controls.tanzaniaOverrides&&!Object.hasOwn(tanzaniaSectionSchemas,section.kind))issues.push({path:`${path}.controls.tanzaniaOverrides`,message:'Source-layout overrides are only supported on Tanzania sections.'});
    if(ids.has(section.id))issues.push({path:`${path}.id`,message:'Section IDs must be unique.'});ids.add(section.id);
    if(section.controls.anchor){if(anchors.has(section.controls.anchor))issues.push({path:`${path}.controls.anchor`,message:'Anchors must be unique.'});anchors.add(section.controls.anchor);}
    if(section.controls.headingLevel==='h1'&&section.controls.visible)h1++;
    const schema=Object.hasOwn(sectionDataSchemas,section.kind)?sectionDataSchemas[section.kind as SectionKind]:undefined;
    if(!schema){issues.push({path:`${path}.kind`,message:'Select an approved section type.'});return;}
    const result=schema.safeParse(section.data);
    if(!result.success)issues.push(...result.error.issues.map(issue=>({path:`${path}.data.${issue.path.join('.')}`,message:issue.message})));
    else {section.data=result.data;checkItemIds(result.data,`${path}.data`,issues);}
  });
  if(h1>1)issues.push({path:'sections',message:'Use at most one visible H1 heading.'});
  return {valid:issues.length===0,issues,...(issues.length?{}:{page})};
}
function checkItemIds(value:unknown,path:string,issues:CompositionIssue[]) {
  if(Array.isArray(value)){
    const ids=new Set<string>();
    value.forEach((item,index)=>{
      if(item&&typeof item==='object'&&'id' in item){const key=String(item.id);if(ids.has(key))issues.push({path:`${path}.${index}.id`,message:'Item IDs must be unique within a collection.'});ids.add(key);}
      checkItemIds(item,`${path}.${index}`,issues);
    });
  } else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))checkItemIds(item,`${path}.${key}`,issues);
}

export type CompositionCommand=
 | {type:'move';id:string;to:number}
 | {type:'remove';id:string}
 | {type:'duplicate';id:string;newId:string}
 | {type:'insert';section:Composition['sections'][number];at:number}
 | {type:'replace';id:string;section:Composition['sections'][number]};
export const compositionCommandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('move'),id,to:z.number().int().min(0).max(99)}).strict(),
 z.object({type:z.literal('remove'),id}).strict(),
 z.object({type:z.literal('duplicate'),id,newId:id}).strict(),
 z.object({type:z.literal('insert'),section:sectionEnvelope,at:z.number().int().min(0).max(100)}).strict(),
 z.object({type:z.literal('replace'),id,section:sectionEnvelope}).strict(),
]);

/** Pure draft commands. Persistence/revision checks remain the server's responsibility. */
export function editComposition(input:unknown,command:CompositionCommand):Composition {
  const validated=validateComposition(input);if(!validated.page)throw new Error('Repair invalid page content before editing its composition.');
  const page=editCompositionDraft(validated.page,command);
  const result=validateComposition(page);if(!result.page)throw new Error(result.issues.map(issue=>`${issue.path}: ${issue.message}`).join('; '));
  return result.page;
}

/** Local draft operations allow incomplete form fields; saving still validates all content. */
export function editCompositionDraft(input:Composition,command:CompositionCommand):Composition {
  const page=structuredClone(input),sections=page.sections;
  const index='id' in command?sections.findIndex(section=>section.id===command.id):-1;
  if(command.type!=='insert'&&index<0)throw new Error('Section not found.');
  const position=command.type==='move'?command.to:command.type==='insert'?command.at:null;
  if(position!==null&&(!Number.isInteger(position)||position<0||position>(command.type==='move'?sections.length-1:sections.length)))throw new Error('Invalid section position.');
  switch(command.type){
    case 'move':{const [section]=sections.splice(index,1);sections.splice(command.to,0,section);break;}
    case 'remove':sections.splice(index,1);break;
    case 'insert':sections.splice(command.at,0,structuredClone(command.section));break;
    case 'replace':if(command.section.id!==command.id)throw new Error('Replacement must retain section identity.');sections[index]=structuredClone(command.section);break;
    case 'duplicate':{const section=structuredClone(sections[index]);section.id=command.newId;delete section.controls.anchor;section.controls.visible=false;section.controls.label+=' (copy)';sections.splice(index+1,0,section);break;}
  }
  if(sections.length>100||new Set(sections.map(section=>section.id)).size!==sections.length||sections.some(section=>!id.safeParse(section.id).success))throw new Error('Use unique section IDs and at most 100 sections.');
  return page;
}

export function sectionIsVisible(section:Composition['sections'][number],context:{now:Date;locale:string;region?:string}) {
  const c=section.controls,time=context.now.getTime();
  return Number.isFinite(time)&&c.visible&&(!c.visibleFrom||time>=Date.parse(c.visibleFrom))&&(!c.visibleUntil||time<Date.parse(c.visibleUntil))
    &&(!c.locales.length||c.locales.includes(context.locale))&&(!c.regions.length||Boolean(context.region&&c.regions.includes(context.region)));
}
