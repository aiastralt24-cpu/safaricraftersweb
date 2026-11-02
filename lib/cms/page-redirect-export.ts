import {parseRedirectList} from './page-redirect-management.ts';
type Scope={site:string;record:string};
type Read=(after:string|null,snapshot:string|null)=>Promise<unknown>;
/** Never offer a partial or mixed-snapshot file. Export uses its own permissioned RPC. */
export async function collectPageRedirectExport(scope:Scope,read:Read){
 const first=parseRedirectList(await read(null,null),{...scope,after:null,snapshot:null});
 const items=[...first.items];let after=first.nextCursor;
 while(after!==null){
  if(items.length>=10000)throw Error('This page has too many redirects for a browser export. No partial file was created.');
  const page=parseRedirectList(await read(after,first.snapshot),{...scope,after,snapshot:first.snapshot});
  if(page.path!==first.path||page.locale!==first.locale||page.published!==first.published)throw Error('The destination changed during export. Start again.');
  items.push(...page.items);after=page.nextCursor;
 }
 return {schemaVersion:1 as const,kind:'cms-page-redirects' as const,site:first.site,recordId:first.recordId,locale:first.locale,destinationPath:first.path,destinationPublished:first.published,snapshot:first.snapshot,redirects:items.map(item=>({sourcePath:item.sourcePath,destinationPath:first.path,status:308 as const,enabled:item.enabled,addressReserved:true,version:item.version}))};
}
