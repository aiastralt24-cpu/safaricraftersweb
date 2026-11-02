import {z} from 'zod';
import {legalPathSchema,projectLegalPage} from './legal-page.ts';
import {newPageSeo} from './page-seo.ts';
const text=z.string().max(50000);
const fragment=z.discriminatedUnion('kind',[z.object({kind:z.literal('text'),text}).strict(),z.object({kind:z.literal('link'),text,href:text.nullable()}).strict()]);
const anchor=z.string().nullable();
const block=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('paragraph'),text,fragments:z.array(fragment).max(200),sourceAnchor:anchor}).strict(),
 z.object({kind:z.literal('heading'),text,level:z.number().int().min(1).max(4),fragments:z.array(fragment).max(200),sourceAnchor:anchor}).strict(),
 z.object({kind:z.literal('list'),ordered:z.boolean(),items:z.array(z.object({text,fragments:z.array(fragment).max(200)}).strict()).max(50),sourceAnchor:anchor}).strict(),
 z.object({kind:z.literal('link'),text,href:text.nullable(),sourceAnchor:anchor}).strict(),
]);
export const legalMigrationSourceSchema=z.object({path:legalPathSchema,sourcePath:z.string(),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),title:text,description:text.nullable(),blocks:z.array(block).min(1).max(500)}).strict();
/** Produces review-only candidates. No database or publication side effects. */
export function planLegalMigration(input:unknown,currentSourceSha256:string){
 const source=legalMigrationSourceSchema.parse(input);
 if(source.sourceSha256!==currentSourceSha256||source.sourcePath!==`app${source.path}/page.tsx`)throw Error('Legal source changed or has an unexpected path. Capture it again before migration.');
 const findings:{block:number|null;code:string;message:string}[]=[];
 const sections:{id:string;kind:'text';controls:{label:string;headingLevel:'h1'|'h2'|'h3'|'h4';width:'reading';spacing:'compact';anchor?:string};data:{title?:string;body:({kind:'paragraph';text:string;spans?:{text:string;href?:string}[]}|{kind:'list';ordered:boolean;items:string[]}|{kind:'link';label:string;href:string})[]}}[]=[];
 const assigned=new Set<string>();
 let current:typeof sections[number]|undefined;
 source.blocks.forEach((block,index)=>{
  if(block.kind==='heading'||!current||(block.sourceAnchor&&block.sourceAnchor!=='main'&&!assigned.has(block.sourceAnchor))){
   current={id:`legal-${index+1}`,kind:'text',controls:{label:block.kind==='heading'?block.text:`Legal text ${index+1}`,headingLevel:block.kind==='heading'?`h${block.level}` as 'h1'|'h2'|'h3'|'h4':'h2',width:'reading',spacing:'compact'},data:{...(block.kind==='heading'?{title:block.text}:{}),body:[]}};
   if(block.sourceAnchor&&block.sourceAnchor!=='main'&&!assigned.has(block.sourceAnchor)){current.controls.anchor=block.sourceAnchor;assigned.add(block.sourceAnchor);}
   sections.push(current);
  }
  const fragments=block.kind==='list'?block.items.flatMap(item=>item.fragments):'fragments' in block?block.fragments:[];
  if(block.kind!=='paragraph'&&fragments.some(fragment=>fragment.kind==='link'))findings.push({block:index,code:'inline_links_not_supported',message:'Inline links in headings or list items need dedicated support.'});
  if(block.kind==='paragraph'){
   const hasLinks=block.fragments.some(fragment=>fragment.kind==='link');
   const spans=block.fragments.map((fragment,i)=>{let text=fragment.text.replace(/\s+/g,' ');if(i===0)text=text.trimStart();if(i===block.fragments.length-1)text=text.trimEnd();return {text,...(fragment.kind==='link'?{href:fragment.href??''}:{})};});
   current!.data.body.push({kind:'paragraph',text:block.text,...(hasLinks?{spans}:{})});
  }
  if(block.kind==='list')current!.data.body.push({kind:'list',ordered:block.ordered,items:block.items.map(item=>item.text)});
  if(block.kind==='link')current!.data.body.push({kind:'link',label:block.text,href:block.href??''});
 });

 const heading=source.blocks.find(block=>block.kind==='heading'&&block.level===1);
 const title=heading?.kind==='heading'?heading.text:source.title;
 const payload={composition:{schemaVersion:1 as const,title,sections},seo:{...newPageSeo(),title,description:source.description??''}};
 if(!findings.length){try{projectLegalPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload},source.path,{locale:'en',now:new Date('2026-10-22T00:00:00Z')});}catch(reason){findings.push({block:null,code:'legal_candidate_invalid',message:reason instanceof Error?reason.message:'Candidate validation failed.'});}}
 return {path:source.path,sourcePath:source.sourcePath,sourceSha256:source.sourceSha256,sourceBlockCount:source.blocks.length,findings,candidate:findings.length?null:payload};
}
