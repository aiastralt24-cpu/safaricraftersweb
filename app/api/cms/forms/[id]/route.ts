import {handlePublicFormRead} from '../../../../../lib/cms/public-form';
import {enquiryHttpConfig} from '../../../../../lib/cms/enquiry-runtime';
import {createEnquiryRpc} from '../../../../../lib/cms/enquiry-database';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,configured=enquiryHttpConfig(process.env),siteKey=process.env.CMS_TURNSTILE_SITE_KEY??'';
 if(!configured||!siteKey)return handlePublicFormRead(request,id,null);
 const rpc=createEnquiryRpc({url:process.env.CMS_SUPABASE_URL??'',serviceKey:process.env.CMS_SUPABASE_SERVICE_ROLE_KEY??''});
 return handlePublicFormRead(request,id,{site:configured.site,siteKey,read:(site,form)=>rpc('get_published_form',{p_site:site,p_form:form})});
}
