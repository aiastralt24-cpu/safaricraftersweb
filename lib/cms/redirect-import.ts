import {z} from 'zod';
import {isCustomPagePath} from './custom-page-path.ts';
import {verifiedSiteRedirectExport} from './site-redirect-export.ts';
const path=z.string().refine(isCustomPagePath),uuid=z.string().uuid();
export const redirectImportRow=z.object({sourcePath:path,destinationPath:path,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),enabled:z.boolean(),recordId:uuid.nullable(),retargetFrom:z.object({recordId:uuid,path}).strict().optional()}).strict();
export type RedirectImportRow=z.infer<typeof redirectImportRow>;
export function parseRedirectImport(text:string,site:string):RedirectImportRow[]{
 if(new TextEncoder().encode(text).length>1000000)throw Error('Redirect files must be at most 1 MB.');
 let raw:unknown;try{raw=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Choose a valid JSON redirect file.');}
 const kind=(raw as {kind?:unknown}|null)?.kind;let rows:RedirectImportRow[];
 if(kind==='cms-site-redirects')rows=verifiedSiteRedirectExport(raw,site).redirects.map(row=>redirectImportRow.parse({sourcePath:row.sourcePath,destinationPath:row.destinationPath,locale:row.locale,enabled:row.enabled,recordId:row.recordId}));
 else if(kind==='cms-redirect-retarget'){
  const parsed=z.object({schemaVersion:z.literal(1),kind:z.literal('cms-redirect-retarget'),site:uuid,redirects:z.array(redirectImportRow.omit({recordId:true}).required({retargetFrom:true}))}).strict().parse(raw);
  if(parsed.site!==site)throw Error('This redirect file belongs to another website.');rows=parsed.redirects.map(row=>({...row,recordId:null}));
 }
 else{
  const parsed=z.object({schemaVersion:z.literal(1),kind:z.literal('cms-redirect-import'),site:uuid,redirects:z.array(redirectImportRow.omit({recordId:true,retargetFrom:true}))}).strict().parse(raw);
  if(parsed.site!==site)throw Error('This redirect file belongs to another website.');
  rows=parsed.redirects.map(row=>({...row,recordId:null}));
 }
 if(!rows.length||rows.length>100)throw Error('Review 1–100 redirects per file. Split larger inventories into explicit batches.');
 const seen=new Set<string>();for(const row of rows){const key=row.locale+':'+row.sourcePath;if(seen.has(key))throw Error('Each source address must occur only once per language.');seen.add(key);if(row.sourcePath===row.destinationPath)throw Error('A redirect cannot point to its own address.');}
 return rows;
}
const reviewed=redirectImportRow.extend({index:z.number().int().nonnegative(),status:z.enum(['new','unchanged','change_state','retarget','blocked']),reason:z.enum(['eligible','destination_unavailable','source_unavailable','identity_changed']),target:uuid.nullable(),published:z.boolean().nullable(),snapshot:z.string().regex(/^[a-f0-9]{32}$/).nullable()}).strict();
export function verifiedRedirectImportReview(raw:unknown,site:string,rows:RedirectImportRow[]){
 const result=z.object({site:uuid,items:z.array(reviewed).max(100)}).strict().parse(raw);
 const mismatch=result.items.some((item,index)=>{
  if(Boolean(item.retargetFrom)!==Boolean(rows[index]?.retargetFrom)||item.index!==index||Object.keys(rows[index]??{}).some(key=>key==='retargetFrom'?item.retargetFrom?.recordId!==rows[index].retargetFrom?.recordId||item.retargetFrom?.path!==rows[index].retargetFrom?.path:item[key as keyof RedirectImportRow]!==rows[index][key as keyof RedirectImportRow]))return true;
  if(item.status==='retarget'&&(!item.retargetFrom||item.target===item.retargetFrom.recordId))return true;
  if(item.retargetFrom&&item.status!=='retarget'&&item.status!=='blocked')return true;
  return item.status==='blocked'?item.reason==='eligible'||item.target!==null||item.published!==null||item.snapshot!==null:item.reason!=='eligible'||item.target===null||item.published===null||item.snapshot===null;
 });
 if(result.site!==site||result.items.length!==rows.length||mismatch)throw Error('The redirect review could not be verified. Review the file again.');
 return result;
}
