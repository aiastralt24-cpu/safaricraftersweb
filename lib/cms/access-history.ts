import {z} from 'zod';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),timestamp=z.iso.datetime({offset:true});
const sequence=z.string().regex(/^[1-9][0-9]{0,18}$/).refine(value=>BigInt(value)<=BigInt('9223372036854775807'));
const membership=z.object({roleId:uuid,expiresAt:timestamp.nullable(),revokedAt:timestamp.nullable(),version:z.number().int().positive()}).strict();
const role=z.object({name:z.string(),version:z.number().int().positive(),permissions:z.array(z.object({action:z.string(),contentType:z.string(),recordId:uuid.nullable()}).strict()).max(200)}).strict();
const base={id:sequence,actorId:uuid.nullable(),createdAt:timestamp};
export const accessHistoryEvent=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('membership.updated'),details:z.object({userId:uuid,reviewedRoleVersion:z.number().int().positive().optional(),before:membership,after:membership}).strict()}).strict(),
 z.object({...base,action:z.literal('role.created'),details:z.object({roleId:uuid,before:z.null(),after:role}).strict()}).strict(),
 z.object({...base,action:z.literal('role.updated'),details:z.object({roleId:uuid,before:role,after:role}).strict()}).strict(),
]);
export type AccessHistoryEvent=z.infer<typeof accessHistoryEvent>;
const querySchema=z.object({site:uuid,before:sequence.optional(),limit:z.string().regex(/^[1-9][0-9]{0,2}$/).transform(Number).pipe(z.number().max(100)).default(50)}).strict();
type Rpc=(token:string,procedure:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleAccessHistory(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),query=new URL(request.url).searchParams;
  if([...query.keys()].some(key=>query.getAll(key).length!==1))throw new CmsGatewayError(400,'Invalid access history query.');
  const parsed=querySchema.safeParse(Object.fromEntries(query));if(!parsed.success)throw new CmsGatewayError(400,'Invalid access history query.');
  const q=parsed.data,rows=z.array(accessHistoryEvent).max(q.limit).safeParse(await call(token,'list_access_history',{p_site:q.site,p_before:q.before??null,p_limit:q.limit}));
  if(!rows.success||rows.data.some((row,index)=>(index>0||q.before!==undefined)&&BigInt(row.id)>=BigInt(index?rows.data[index-1].id:q.before!)))throw new CmsGatewayError(503,'Access history returned an invalid response.');
  return Response.json({items:rows.data,nextCursor:rows.data.length===q.limit?rows.data.at(-1)!.id:null},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
