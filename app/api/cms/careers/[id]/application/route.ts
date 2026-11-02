import {handleCareerApplicationForm} from '../../../../../../lib/cms/career-application-form';
import {enquiryHttpConfig} from '../../../../../../lib/cms/enquiry-runtime';
import {createEnquiryRpc} from '../../../../../../lib/cms/enquiry-database';
import {usesCmsCareer} from '../../../../../../lib/cms/public-career-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,configured=enquiryHttpConfig(process.env),siteKey=process.env.CMS_TURNSTILE_SITE_KEY??'';
 if(!usesCmsCareer()||!configured||!siteKey)return handleCareerApplicationForm(request,id,null);
 const rpc=createEnquiryRpc({url:process.env.CMS_SUPABASE_URL??'',serviceKey:process.env.CMS_SUPABASE_SERVICE_ROLE_KEY??''});
 return handleCareerApplicationForm(request,id,{site:configured.site,siteKey,read:input=>rpc('get_career_application_form',{p_site:input.site,p_record:input.record,p_revision:input.revision,p_form:input.form,p_form_revision:input.formRevision})});
}
