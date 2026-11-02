import {z} from 'zod';
import {parseRedirectImport,verifiedRedirectImportReview} from './redirect-import.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),snapshot=z.string().regex(/^[a-f0-9]{32}$/);
export const savedRedirectImport=z.object({site:uuid,actor:uuid,requestKey:uuid,file:z.string().max(1000000),snapshots:z.array(snapshot).min(1).max(100)}).strict();
export type SavedRedirectImport=z.infer<typeof savedRedirectImport>;
export function redirectImportStorageKey(site:string,actor:string){return `cms-redirect-import:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function parseSavedRedirectImport(raw:string,site:string,actor:string){
 if(raw.length>1100000)throw Error('Saved redirect import is too large.');const saved=savedRedirectImport.parse(JSON.parse(raw));
 if(saved.site!==site||saved.actor!==actor||parseRedirectImport(saved.file,site).length!==saved.snapshots.length)throw Error('Saved redirect import does not match this account and website.');return saved;
}
export function verifiedRedirectImportReceipt(raw:unknown,scope:{site:string;requestKey:string;actor?:string;file?:string;snapshots?:string[]}){
 const value=z.object({site:uuid,actor:uuid,requestKey:uuid,proposalId:uuid.nullable(),status:z.enum(['submitted','approved','rejected','cancelled','applied']),sourceDigest:digest.nullable(),review:z.unknown()}).strict().parse(raw);
 if(value.site!==scope.site||value.requestKey!==scope.requestKey||scope.actor&&value.actor!==scope.actor)throw Error('The redirect import receipt belongs to another request.');
 if(value.proposalId===null){if(value.status!=='cancelled'||value.sourceDigest!==null||value.review!==null)throw Error('Invalid stopped redirect import receipt.');return value;}
 if(value.sourceDigest===null||!value.review)throw Error('Invalid redirect proposal receipt.');
 const stored=z.object({site:uuid,items:z.array(z.record(z.string(),z.unknown())).min(1).max(100)}).parse(value.review);
 const rows=scope.file?parseRedirectImport(scope.file,scope.site):stored.items.map(row=>({sourcePath:row.sourcePath,destinationPath:row.destinationPath,locale:row.locale,enabled:row.enabled,recordId:row.recordId,...(row.retargetFrom?{retargetFrom:row.retargetFrom}:{})}));
 const review=verifiedRedirectImportReview(value.review,scope.site,rows as ReturnType<typeof parseRedirectImport>);
 if(review.items.some(item=>item.status==='blocked')||!review.items.some(item=>item.status!=='unchanged')||scope.snapshots&&review.items.some((item,index)=>item.snapshot!==scope.snapshots![index]))throw Error('Redirect proposal evidence does not match the reviewed batch.');
 return {...value,review};
}
