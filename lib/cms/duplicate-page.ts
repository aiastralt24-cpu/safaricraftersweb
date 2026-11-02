import {validateComposition} from './composition.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
/** Copies editable draft content only. Identity, workflow, publication and menus
 * belong to their own records and must never be copied to the new page. */
export function duplicatePageContent(payload:Record<string,unknown>,title:string){
 if(Object.keys(payload).some(key=>!['composition','seo'].includes(key)))throw Error('This page contains fields that need a duplication migration.');
 const parsed=validateComposition(payload.composition);if(!parsed.valid||!parsed.page)throw Error('Repair this page composition before duplicating it.');
 const seo=pageSeoSchema.parse(payload.seo??newPageSeo());
 const newTitle=`${title.trim()} (copy)`.slice(0,200);
 return {title:newTitle,path:'',composition:structuredClone({...parsed.page,title:newTitle}),seo:structuredClone({...seo,canonical:''})};
}
