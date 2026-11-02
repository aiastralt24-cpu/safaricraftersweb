import {z} from 'zod';
import inventory from '../../docs/cms/mice-migration-inventory.json' with {type:'json'};
import contactInventory from '../../docs/cms/contact-migration-inventory.json' with {type:'json'};
import {miceSectionKinds,miceSectionSchemas} from './mice-content.ts';
import {createMiceSection} from './mice-section-drafts.ts';
import {validateComposition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(100);
const bindingsSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(v=>!v.startsWith('review-only-'))}).strict()).max(100);
export const miceMigrationDependencies=[...inventory.sources,...inventory.media.map(m=>({sourcePath:`public${m.sourcePath}`,sha256:m.sha256}))];
/** Pure review proposal. Inputs never authorize media, create drafts, bind a
 * published form or bypass approval. Apply remains unavailable. */
export function planMiceMigration(currentHashes:unknown,mediaBindings:unknown=[],formId:unknown=null){
 const proof=proofSchema.parse(currentHashes),bindings=bindingsSchema.parse(mediaBindings),form=formId===null?null:z.string().uuid().parse(formId);
 if(proof.length!==miceMigrationDependencies.length||new Set(proof.map(p=>p.sourcePath)).size!==proof.length||miceMigrationDependencies.some(expected=>!proof.some(p=>p.sourcePath===expected.sourcePath&&p.sha256===expected.sha256)))throw Error('MICE source changed. Recapture and review before migration.');
 if(new Set(bindings.map(b=>b.sourcePath)).size!==bindings.length)throw Error('Duplicate MICE media binding.');
 for(const binding of bindings){if(!inventory.media.some(m=>m.sourcePath===binding.sourcePath&&m.sha256===binding.sourceSha256))throw Error('Unknown or stale MICE media binding.');if(bindings.some(other=>other.assetId===binding.assetId&&other.sourceSha256!==binding.sourceSha256))throw Error('Different source images need distinct processed assets.');}
 const desktop=inventory.views.find(v=>v.width===1280),mobile=inventory.views.find(v=>v.width===390);
 if(!desktop||!mobile||desktop.data.length!==6||JSON.stringify(desktop.data)!==JSON.stringify(mobile.data)||JSON.stringify(desktop.form)!==JSON.stringify(mobile.form))throw Error('Review changed MICE responsive content before migration.');
 const oldForm=contactInventory.routes.find(r=>r.path==='/mice')?.form;
 const sharedHash=inventory.sources.find(s=>s.sourcePath==='components/ContactForm.tsx')?.sha256;
 if(!oldForm||!sharedHash||sharedHash!==contactInventory.sources.find(s=>s.sourcePath==='components/ContactForm.tsx')?.sha256||JSON.stringify(oldForm.fields.map(f=>({name:f.name,required:f.required,defaultValue:f.defaultValue,...('options' in f?{options:f.options}:{})})))!==JSON.stringify(desktop.form.fields)||oldForm.submitLabel!==desktop.form.submitLabel)throw Error('Corporate form migration evidence changed. Review the shared form migration.');
 const asset=(path:string)=>{const index=inventory.media.findIndex(m=>m.sourcePath===path);if(index<0)throw Error('Uncaptured MICE image.');return bindings.find(b=>b.sourcePath===path)?.assetId??`review-only-mice-${index+1}`;};
 const media=(value:{sourcePath:string;alt:string;focalPoint:{x:number;y:number}},credit?:string)=>({image:{assetId:asset(value.sourcePath),alt:value.alt,decorative:false,...(credit?{credit}:{})},focalPoint:value.focalPoint});
 // Capture data is checked by each section schema before leaving this planner.
 const data:any[]=structuredClone(desktop.data);
 data[0]={...data[0],...media(data[0].image,data[0].credit)};delete data[0].credit;
 data[3].items=data[3].items.map((item:any)=>({...item,...media(item.image)}));
 if(form)data[5].form={recordId:form};
 const checked=validateComposition({schemaVersion:1,title:'Corporate Travel & MICE',sections:miceSectionKinds.map((kind,i)=>({...createMiceSection(kind,`mice-section-${i+1}`),data:miceSectionSchemas[kind].parse(data[i])}))});
 if(!checked.valid||!checked.page)throw Error('Invalid MICE migration composition.');
 const seo=pageSeoSchema.parse({...newPageSeo(),title:desktop.metadata.title,description:desktop.metadata.description,canonical:desktop.metadata.canonical});
 return {mode:'review-only' as const,readyToApply:false as const,path:'/mice',sourceProof:proof,previewPayload:{composition:checked.page,seo},mediaBindings:bindings,missingMedia:inventory.media.filter(m=>!bindings.some(b=>b.sourcePath===m.sourcePath)),formId:form,legacyForm:structuredClone(oldForm),metadata:structuredClone(desktop.metadata),findings:[
 {code:'media_rights_review',message:'Verify processed assets, rights and current availability through the trusted backend.'},
 {code:'corporate_form_review',message:'Reuse the existing corporate form migration; verify a same-site published revision, lead mappings, consent and notification routing.'},
 {code:'metadata_review',message:'Review captured social/indexing tags and inherited sharing imagery before publication; no sharing image was inferred.'},
 {code:'delivery_pending',message:'Migration apply, trusted publication and public delivery are not connected. No content was saved.'},
 ]};
}
