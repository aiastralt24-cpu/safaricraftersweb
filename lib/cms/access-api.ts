import {readBoundedJson} from './editor-api.ts';
import {z} from 'zod';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const permission=z.object({action:z.enum(['view','create','edit','submit','approve','publish','export','delete','configure']),contentType:z.string().min(1),recordId:uuid.nullable()}).strict();
const role=z.object({id:uuid,name:z.string().min(1),version:z.number().int().positive(),permissions:z.array(permission)}).strict();
const member=z.object({userId:uuid,roleId:uuid,version:z.number().int().positive(),expiresAt:z.iso.datetime({offset:true}).nullable(),revokedAt:z.iso.datetime({offset:true}).nullable(),status:z.enum(['active','expired','revoked'])}).strict();
const directoryMember=member.extend({email:z.string().max(320).nullable()});
const querySchema=z.object({site:uuid,kind:z.enum(['roles','members']),after:uuid.optional(),limit:z.string().regex(/^[1-9][0-9]{0,2}$/).transform(Number).pipe(z.number().max(100)).default(50)}).strict();
type AccessRpc=(token:string,procedure:string,args:Record<string,unknown>)=>Promise<unknown>;
const rpc:AccessRpc=(token,procedure,args)=>cmsRpc(cmsConnection(),token,procedure,args);
/** Database functions authorize every read using the caller's current membership. */
export async function handleAccessRead(request:Request,call:AccessRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const query=new URL(request.url).searchParams;
  if([...query.keys()].some(key=>query.getAll(key).length!==1))throw new CmsGatewayError(400,'Invalid access directory query.');
  const parsed=querySchema.safeParse(Object.fromEntries(query));
  if(!parsed.success)throw new CmsGatewayError(400,'Invalid access directory query.');
  const q=parsed.data;
  const result=await call(token,q.kind==='roles'?'list_access_roles':'list_access_members',{p_site:q.site,p_after:q.after??null,p_limit:q.limit});
  const validated=(q.kind==='roles'?z.array(role):z.array(directoryMember)).safeParse(result);
  if(!validated.success||validated.data.length>q.limit)throw new CmsGatewayError(503,'The access directory returned an invalid response.');
  const rows=validated.data;
  const ids=rows.map(row=>'id' in row?row.id:row.userId);
  if(ids.some((id,index)=>id<=(index?ids[index-1]:q.after??'')))throw new CmsGatewayError(503,'The access directory returned an invalid response.');
  return Response.json({items:rows,nextCursor:rows.length===q.limit?ids.at(-1):null},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}

const membershipCommand=z.object({site:uuid,userId:uuid,expectedVersion:z.number().int().positive(),expectedRoleVersion:z.number().int().positive(),roleId:uuid,expiresAt:z.iso.datetime({offset:true}).nullable(),revoked:z.boolean()}).strict();
export async function handleAccessCommand(request:Request,call:AccessRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  if(url.search)throw new CmsGatewayError(400,'Invalid access update query.');
  const parsed=membershipCommand.safeParse(await readBoundedJson(request));
  if(!parsed.success)throw new CmsGatewayError(422,'Check the membership fields.');
  const c=parsed.data;
  const result=member.safeParse(await call(token,'update_membership',{p_site:c.site,p_user:c.userId,p_expected:c.expectedVersion,p_role:c.roleId,p_expires:c.expiresAt,p_revoked:c.revoked,p_expected_role:c.expectedRoleVersion}));
  if(!result.success||result.data.userId!==c.userId||result.data.roleId!==c.roleId||result.data.version!==c.expectedVersion+1
   ||result.data.status!==(c.revoked?'revoked':'active')
   ||(result.data.revokedAt!==null)!==c.revoked
   ||(result.data.expiresAt===null)!==(c.expiresAt===null)
   ||(c.expiresAt!==null&&Date.parse(result.data.expiresAt!)!==Date.parse(c.expiresAt)))
   throw new CmsGatewayError(503,'The access update could not be verified. Reload the member before trying again.');
  return Response.json({member:result.data},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}

const roleCommand=z.object({site:uuid,roleId:uuid.nullable(),expectedVersion:z.number().int().positive().nullable(),name:z.string().trim().min(1).max(100),permissions:z.array(permission).max(200)}).strict();
export async function handleRoleCommand(request:Request,call:AccessRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  if(url.search)throw new CmsGatewayError(400,'Invalid role update query.');
  const parsed=roleCommand.safeParse(await readBoundedJson(request));
  if(!parsed.success)throw new CmsGatewayError(422,'Check the role and permission fields.');
  const c=parsed.data;
  if((c.roleId===null)!==(c.expectedVersion===null))throw new CmsGatewayError(422,'Existing roles require their current version.');
  const result=role.safeParse(await call(token,'save_access_role',{p_site:c.site,p_role:c.roleId,p_expected:c.expectedVersion,p_name:c.name,p_permissions:c.permissions}));
  if(!result.success||(c.roleId!==null&&result.data.id!==c.roleId)||result.data.version!==(c.expectedVersion??0)+1||result.data.name!==c.name
   ||JSON.stringify(result.data.permissions)!==JSON.stringify(c.permissions))
   throw new CmsGatewayError(503,'The role update could not be verified. Reload roles before trying again.');
  return Response.json({role:result.data},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
