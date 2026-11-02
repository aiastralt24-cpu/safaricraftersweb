import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {localizedPageHref} from './localized-routes.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const identity=z.object({site:uuid,record:uuid,revision:uuid,locale:language}).strict();
const canonical=z.string().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\]/.test(value);}catch{return false;}});
const variant=z.object({recordId:uuid,revisionId:uuid,locale:language,path:z.string().refine(isCustomPagePath),indexable:z.boolean(),canonical}).strict();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,variants:z.array(variant).max(100)}).strict();
export function verifiedLanguageVariants(input:unknown,expected:z.infer<typeof identity>){
 identity.parse(expected);if(input===null)return null;
 const value=envelope.parse(input);
 if(value.websiteId!==expected.site||value.recordId!==expected.record||value.revisionId!==expected.revision||value.locale!==expected.locale)throw Error('Published language variants changed. Reload before linking.');
 if(new Set(value.variants.map(row=>row.locale)).size!==value.variants.length||new Set(value.variants.map(row=>row.recordId)).size!==value.variants.length)throw Error('Published language variants contain duplicates.');
 const self=value.variants.find(row=>row.locale===expected.locale);
 if(self&&(self.recordId!==expected.record||self.revisionId!==expected.revision))throw Error('Published language variant identity mismatch.');
 return value.variants.map(row=>({...row,href:row.locale==='en'?row.path:localizedPageHref(row.locale,row.path)}));
}
export async function readPublicLanguageVariants(expected:z.infer<typeof identity>,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return null;
 identity.parse(expected);
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_CUSTOM_PAGES_ENABLED!=='true'||env.CMS_WEBSITE_ID!==expected.site||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Language variant delivery is not configured.');
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return verifiedLanguageVariants(await cmsRpc(connection,connection.key,'get_public_language_variants',{p_site:expected.site,p_record:expected.record,p_revision:expected.revision,p_locale:expected.locale},fetcher),expected);
}
