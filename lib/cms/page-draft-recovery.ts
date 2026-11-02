import {isCustomPagePath} from './custom-page-path.ts';
import {z} from 'zod';
import {validateComposition} from './composition.ts';
import {pageSeoSchema} from './page-seo.ts';
import {conceptNavigationSchema} from './concept-navigation.ts';
const recoverySchema=z.object({title:z.string().trim().min(1).max(200),path:z.string(),page:z.unknown(),seo:pageSeoSchema,conceptMenu:conceptNavigationSchema.nullable()}).strict();
/** A checkpoint may restore editable fields, never move a saved page. */
export function parsePageRecoveryDraft(input:unknown,path:string){
 const value=recoverySchema.parse(input);
 if(value.path!==path||path!=='/'&&!/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(path))throw Error('Recovered page URL does not match this record.');
 if(path!=='/concept'&&value.conceptMenu!==null)throw Error('Recovered navigation does not belong to this page.');
 const parsed=validateComposition(value.page);
 if(!parsed.valid||!parsed.page)throw Error('Recovered page sections are invalid. The current draft is preserved.');
 return {...value,page:parsed.page};
}

export function parseNewPageRecoveryDraft(input:unknown,kind:'page'|'homepage'){
 const {duplicateSource,...editor}=recoverySchema.extend({duplicateSource:z.string().uuid().nullable()}).parse(input);
 if(kind==='homepage'?editor.path!=='/'||duplicateSource!==null:editor.path==='/')throw Error('Recovered page type and URL do not match.');
 if(duplicateSource&&!isCustomPagePath(editor.path))throw Error('A duplicate needs a new custom page URL.');
 return {...parsePageRecoveryDraft(editor,editor.path),duplicateSource};
}
