import type {EnquiryRpc} from './enquiry-database.ts';
import type {EnquiryFileSessionCreateAdapter,EnquiryFileSessionIdentity} from './enquiry-file-session-create.ts';
export function createEnquiryFileSessionCreateAdapter(rpc:EnquiryRpc,consumeRate:()=>Promise<unknown>,verifyChallenge:(token:string)=>Promise<boolean>):EnquiryFileSessionCreateAdapter{
 const args=(i:EnquiryFileSessionIdentity,hash:string)=>({p_site:i.site,p_form:i.form,p_revision:i.revision,p_request:i.request,p_session:i.session,p_token_hash:hash});
 return {consumeRate,verifyChallenge,lookup:(i,hash)=>rpc('get_enquiry_file_session',args(i,hash)),create:(i,hash)=>rpc('create_enquiry_file_session',args(i,hash))};
}
