import {z} from 'zod';
import {image,link,safeHref,inlineSpan,richTable,richList} from './composition.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';

const short=z.string().max(200),copy=z.string().max(10000);
const blockId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
/** Structured text only: renderers must escape text, never interpret it as HTML. */
export const journalBlockSchema=z.discriminatedUnion('kind',[
 richTable.safeExtend({id:blockId}),
 z.object({id:blockId,kind:z.literal('paragraph'),text:copy,spans:z.array(inlineSpan).min(1).max(200).optional()}).strict().refine(value=>!value.spans||value.spans.map(span=>span.text).join('')===value.text,'Inline text must match the full paragraph.'),
 z.object({id:blockId,kind:z.literal('heading'),level:z.enum(['h2','h3']),text:short.trim().min(1)}).strict(),
 richList.safeExtend({id:blockId,items:z.array(z.string().trim().min(1).max(2000)).min(1).max(50)}),
 z.object({id:blockId,kind:z.literal('quote'),text:copy,attribution:short}).strict(),
 z.object({id:blockId,kind:z.literal('link'),label:short.trim().min(1),href:safeHref}).strict(),
 z.object({id:blockId,kind:z.literal('image'),image}).strict(),
]);
export const journalArticleSchema=z.object({
 schemaVersion:z.literal(1),slug:z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:short.trim().min(1),
 category:short,author:short,date:z.union([z.literal(''),z.iso.date()]),readTime:z.string().max(80),description:z.string().max(2000),
 image:image.optional(),heroImage:image.optional(),gallery:z.array(image).max(50),
 body:z.array(journalBlockSchema).max(200).refine(blocks=>new Set(blocks.map(block=>block.id)).size===blocks.length,'Each article block needs a unique ID.'),
 quote:copy,seo:pageSeoSchema,
 sources:z.array(z.object({title:short.trim().min(1),url:safeHref.refine(url=>url.startsWith('https://'),'Use an HTTPS source URL.'),publisher:short,accessedAt:z.iso.date()}).strict()).max(100),
 cta:z.object({enabled:z.boolean(),heading:short,copy,button:link}).strict(),
}).strict();
export type JournalArticleDraft=z.infer<typeof journalArticleSchema>;
export type JournalBlock=z.infer<typeof journalBlockSchema>;
export function newJournalArticle():JournalArticleDraft{return {
 schemaVersion:1,slug:'new-article',title:'New article',category:'',author:'',date:'',readTime:'',description:'',gallery:[],body:[],quote:'',seo:newPageSeo(),sources:[],
 cta:{enabled:true,heading:'Shape this field note into a journey.',copy:'',button:{label:'Plan a Journey',href:'/plan',newWindow:false}},
};}
export function validateJournalArticle(record:{path:string|null;locale?:string;payload:unknown},mediaStatus?:{assetId:string;available:boolean}[]){
 const parsed=journalArticleSchema.safeParse(record.payload);
 const findings:{field:string;severity:'error'|'warning';code:string;message:string}[]=parsed.success?[]:parsed.error.issues.map(issue=>({field:issue.path.join('.'),severity:'error',code:'journal_field',message:issue.message}));
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 if(parsed.success){
  const value=parsed.data;
  if((record.locale??'en')!=='en')error('locale','journal_locale_not_ready','Public journal routes currently support English only. Keep other languages as drafts.');
  if(record.path!==`/journal/${value.slug}`)error('slug','path_mismatch','The article slug must match its saved URL.');
  for(const field of ['category','author','date','description'] as const)if(!value[field].trim())error(field,'incomplete_article','Complete this field before preparing the article for publication.');
  if(!value.body.some(block=>(block.kind==='paragraph'||block.kind==='quote')&&block.text.trim()||block.kind==='list'&&block.items.some(item=>item.trim())))error('body','article_body_required','Add article text before publication.');
  if(!value.image)error('image','article_image_required','Choose a listing image before publication.');
  if(value.cta.enabled&&!value.cta.heading.trim())error('cta.heading','article_cta_heading','Give the enabled call to action a heading.');
  const visit=(input:unknown,path:string)=>{
   if(Array.isArray(input)){input.forEach((item,index)=>visit(item,`${path}.${index}`));return;}
   if(!input||typeof input!=='object')return;
   for(const [key,item] of Object.entries(input)){
    const field=path?`${path}.${key}`:key;
    if(key==='assetId'){if(!mediaStatus?.some(asset=>asset.assetId===item&&asset.available))error(field,'asset_verification_required','Select an inspected image with current approved rights for this website.');}
    else visit(item,field);
   }
  };
  visit(value,'');findings.push(...pageSeoFindings(value.seo));
 }
 return {validatorVersion:'journal-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
