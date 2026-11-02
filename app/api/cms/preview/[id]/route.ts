import {bearerToken,cmsRpc,CmsGatewayError,privateHeaders} from '../../../../../lib/cms/gateway.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const token=bearerToken(request.headers.get('authorization'));
    const {id}=await context.params;
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return Response.json({error:'Preview is unavailable.'},{status:404,headers:privateHeaders});
    const preview=await cmsRpc({url:process.env.CMS_SUPABASE_URL||'',key:process.env.CMS_SUPABASE_ANON_KEY||''},token,'get_preview',{p_id:id});
    if(!preview)return Response.json({error:'Preview is unavailable or expired.'},{status:404,headers:privateHeaders});
    return Response.json(preview,{headers:privateHeaders});
  }catch(error){
    return Response.json({error:error instanceof CmsGatewayError?error.message:'Preview is unavailable.'},{status:error instanceof CmsGatewayError?error.status:500,headers:privateHeaders});
  }
}
