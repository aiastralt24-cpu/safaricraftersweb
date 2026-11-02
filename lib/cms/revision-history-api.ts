import {z} from 'zod';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const query=z.object({site:uuid,record:uuid,before:uuid.optional(),limit:z.string().regex(/^(?:[1-9]|[1-9][0-9]|100)$/).default('20')}).strict();
const resultSchema=z.object({recordId:uuid,items:z.array(z.object({id:uuid,parentRevision:uuid.nullable(),authorId:uuid,createdAt:z.string().datetime({offset:true})}).strict()).max(100),nextCursor:uuid.nullable()}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleRevisionHistory(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if(new Set(params.keys()).size!==[...params.keys()].length)throw new CmsGatewayError(422,'Duplicate history parameters are not allowed.');
  const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose a record and valid history cursor.');
  const q=parsed.data,limit=Number(q.limit),raw=await call(token,'list_revision_history',{p_site:q.site,p_record:q.record,p_before:q.before??null,p_limit:limit});
  if(raw===null)throw new CmsGatewayError(404,'Content history is unavailable.');
  const checked=resultSchema.safeParse(raw);
  if(!checked.success)throw new CmsGatewayError(503,'CMS returned invalid history.');
  const result=checked.data;
  if(result.recordId!==q.record||result.items.length>limit||new Set(result.items.map(item=>item.id)).size!==result.items.length||result.items.some(item=>item.id===q.before)||(result.nextCursor!==null&&(result.items.length!==limit||result.nextCursor!==result.items.at(-1)?.id)))throw new CmsGatewayError(503,'CMS returned invalid history.');
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
