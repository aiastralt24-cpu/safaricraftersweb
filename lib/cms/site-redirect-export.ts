import {z} from 'zod';
import {isCustomPagePath} from './custom-page-path.ts';
const path=z.string().refine(isCustomPagePath);
const schema=z.object({schemaVersion:z.literal(1),kind:z.literal('cms-site-redirects'),site:z.string().uuid(),exportedAt:z.string().datetime({offset:true}),redirects:z.array(z.object({recordId:z.string().uuid(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),sourcePath:path,destinationPath:path.nullable(),destinationPublished:z.boolean(),status:z.literal(308),enabled:z.boolean(),addressReserved:z.literal(true),version:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict()).max(10000)}).strict();
export function verifiedSiteRedirectExport(value:unknown,site:string){
 const result=schema.parse(value);
 if(result.site!==site||result.redirects.some((row,index)=>{const previous=result.redirects[index-1];return previous&&(previous.locale>row.locale||previous.locale===row.locale&&previous.sourcePath>=row.sourcePath);}))throw Error('The redirect export identity or ordering is invalid. No file was created.');
 return result;
}
