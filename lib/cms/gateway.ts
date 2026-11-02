/** User-token-only PostgREST gateway. Never pass a service-role key here. */
export class CmsGatewayError extends Error {
  status:number;
  constructor(status:number,message:string){super(message);this.status=status;this.name='CmsGatewayError';}
}
export const privateHeaders={
  'Cache-Control':'private, no-store, max-age=0',
  'Pragma':'no-cache',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'Referrer-Policy':'no-referrer',
  'Vary':'Authorization',
};
export function bearerToken(header:string|null):string {
  const match=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header||'');
  if(!match||match[1].length>8192)throw new CmsGatewayError(401,'Sign in to the CMS.');
  return match[1];
}
export async function cmsRpc(config:{url:string;key:string},token:string,procedure:string,args:Record<string,unknown>,fetcher:typeof fetch=fetch):Promise<unknown> {
  let base:URL;
  try {base=new URL(config.url);}catch{throw new CmsGatewayError(503,'CMS connection is not configured.');}
  if(base.protocol!=='https:'||base.username||base.password||!config.key||base.pathname!=='/'||base.search||base.hash)throw new CmsGatewayError(503,'CMS connection is not configured.');
  if(!/^[a-z_]+$/.test(procedure))throw new CmsGatewayError(500,'Invalid CMS operation.');
  let response:Response;
  try {
    response=await fetcher(new URL(`/rest/v1/rpc/${procedure}`,base),{
      method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},
      body:JSON.stringify(args),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    });
  } catch{throw new CmsGatewayError(503,'CMS is temporarily unavailable.');}
  if(!response.ok){
    if(response.status===409)throw new CmsGatewayError(409,'Content changed or this URL is already in use. Reload before saving.');
    if(response.status===400){
      let code='',message='';
      try{const body=await response.json();code=body.code;message=body.message;}catch{/* No upstream body is returned. */}
      const known:Record<string,string>={
        custom_page_link_unavailable:'A linked page is unavailable in this page language. Check its publication and media rights, then request another trusted check.',
        custom_page_route_not_ready:'This page URL or language cannot be published through this workflow. Use an eligible custom URL or the supported page-specific workflow.',
        homepage_header_verification_required:'The homepage header is no longer ready. Recheck published site settings, menus, linked content and image rights, then run validation again.',
        homepage_reference_verification_required:'A selected homepage item is no longer available. Recheck its publication status, language, consent and media rights.',
        homepage_link_verification_required:'A homepage link is no longer available. Choose a published destination and validate the saved revision again.',
        homepage_route_not_ready:'The homepage must use the English root URL (/).',
        migration_media_unavailable:'A mapped image or video no longer passes source, processing or usage-rights checks. Review the migration again.',
        migration_media_mismatch:'The proposed draft contains media outside the reviewed mappings. Prepare and review the mappings again.',
        migration_reference_unavailable:'A mapped content record is unavailable or cannot be viewed. Check the website, content type and access before reviewing again.',
        migration_reference_mismatch:'The proposed draft references content outside the reviewed mappings. Prepare and review the mappings again.',
        idempotency_key_reused:'This request identity belongs to a different migration. Recover the earlier result or start a fresh review.',
        settings_reference_verification_required:'A settings menu or featured item, or content linked from it, is no longer available. Recheck published content, language and image rights before retrying.',
        settings_url_verification_required:'A settings link is not a verified public destination. Choose a supported website page or a safe external HTTPS link.',
        settings_route_not_ready:'Website settings currently support English and cannot have a page URL.',
        invalid_history_cursor:'This revision is not available in the selected record history. Reload the settings workspace before loading older revisions.',
        destination_reference_verification_required:'A related destination, journey or expedition is no longer ready for publication. Recheck its language, published route and media rights.',
        destination_reserved_route:'This destination URL belongs to a country or regional atlas page. Choose a distinct URL before publication.',
        role_not_found:'This website role is unavailable. Reload the role list.',
        role_name_in_use:'Choose a different role name for this website.',
        invalid_role:'Check the role name and permission list.',
        invalid_role_permission:'Check the permission action, module and record scope.',
        duplicate_role_permission:'Remove duplicate permission entries.',
        membership_not_found:'This website membership is unavailable. Reload the member list.',
        invalid_membership:'Select a role from this website and a future expiry date, if required.',
        permanent_access_administrator_required:'Keep at least one active access administrator without an expiry date.',
        unsupported_validation_type:'Trusted validation is not available for this content type yet.',
        validation_request_throttled:'Please wait briefly before requesting another trusted check.',
        approved_revision_required:'Approve the current revision before publishing.',
        validated_revision_required:'This revision must pass publication validation before publishing.',
        media_verification_required:'An image is unavailable or lacks current usage rights. Check the media before publishing.',
        invalid_upload:'Use a supported image filename, type and size under 25 MB.',
        upload_limit:'Finish or cancel your pending uploads before starting more.',
        upload_already_processing:'This upload has started processing and cannot be cancelled here.',
        invalid_media_metadata:'Check the image title, text lengths and tags.',
        invalid_media_rights:'Approved rights need evidence and a future expiry date, if one is set.',
        download_reference_verification_required:'A download link no longer points to an eligible published document version in this language. Update the selection and check its PDF rights and dates.',
        document_publication_verification_required:'The document is no longer ready for publication. Recheck its PDF processing, rights, dates and related products.',
        document_file_in_use:'This PDF is used by draft content, published content or an active preview. Resolve those references before archiving.',
        archived_document_reference:'This content references an archived PDF. Restore it or choose another file before saving.',
        media_in_use:'This image is used by draft content, published content or an active preview. Resolve those references before archiving.',
        archived_media_reference:'This content references an archived image. Restore it or choose another image before saving.',
        invalid_review_transition:'This review action is not available in the current state.',
        route_or_type_change_requires_migration:'Use the URL migration workflow to change a page address or type.',
        self_approval_forbidden:'A different reviewer must approve this revision.',
      };
      if(code==='40001'&&message==='role_conflict')throw new CmsGatewayError(409,'This role changed. Reload before saving.');
      if(code==='40001'&&message==='membership_conflict')throw new CmsGatewayError(409,'This membership changed. Reload before saving.');
      if(code==='40001')throw new CmsGatewayError(409,'Content changed. Reload before saving.');
      if(code==='P0001')throw new CmsGatewayError(422,known[message]||'The operation is not valid for the current content state.');
    }
    // Never return raw database errors, tokens, upstream URLs or payloads.
    const status=response.status===401?401:response.status===403?403:503;
    throw new CmsGatewayError(status,status===401?'Your CMS session has expired.':status===403?'You do not have access to this content.':'CMS is temporarily unavailable.');
  }
  if(response.status===204)return null;
  try{return await response.json();}catch{throw new CmsGatewayError(503,'CMS returned an invalid response.');}
}
export function cmsConnection(){return {url:process.env.CMS_SUPABASE_URL||'',key:process.env.CMS_SUPABASE_ANON_KEY||''};}
export function cmsErrorResponse(error:unknown){
  return Response.json({error:error instanceof CmsGatewayError?error.message:'The CMS operation failed.'},{status:error instanceof CmsGatewayError?error.status:500,headers:privateHeaders});
}
