import {createHash} from 'node:crypto';
import {z} from 'zod';
import {parseJourneyDocx,parseJourneyXlsx,ImportFileError,FILE_LIMITS} from './import-file.ts';
import {reviewJourneyImport} from './import-review.ts';
import type {ReviewRecord} from './import-review.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import type {EditorRpc} from './editor-api.ts';
const headersSchema=z.object({site:z.string().uuid(),format:z.enum(['xlsx','docx']),action:z.enum(['review','apply']),request:z.string().uuid().nullable(),review:z.string().regex(/^[a-f0-9]{64}$/).nullable()});
const recordSchema=z.object({id:z.string().uuid(),type:z.literal('journey'),currentRevision:z.string().uuid(),path:z.string().regex(/^\/journeys\/[a-z0-9-]+$/),locale:z.string(),title:z.string(),payload:z.record(z.string(),z.unknown())});
const defaultRpc:EditorRpc=(token,procedure,args)=>cmsRpc(cmsConnection(),token,procedure,args);
export async function fileBytes(request:Request){
  if(Number(request.headers.get('content-length'))>FILE_LIMITS.bytes)throw new CmsGatewayError(413,'Use a file no larger than 5 MB.');
  const reader=request.body?.getReader();if(!reader)throw new CmsGatewayError(400,'Choose a file to upload.');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>FILE_LIMITS.bytes){await reader.cancel();throw new CmsGatewayError(413,'Use a file no larger than 5 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks,size);
}
export async function handleImportUpload(request:Request,call:EditorRpc=defaultRpc){
  try{
    const token=bearerToken(request.headers.get('authorization'));
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
    const parsed=headersSchema.safeParse({site:request.headers.get('x-cms-site'),format:request.headers.get('x-cms-format'),action:request.headers.get('x-cms-action'),request:request.headers.get('idempotency-key'),review:request.headers.get('x-cms-review')});
    if(!parsed.success)throw new CmsGatewayError(400,'Invalid import request headers.');
    const h=parsed.data;
    if(h.action==='apply'&&(!h.request||!h.review))throw new CmsGatewayError(400,'Review the import before applying it.');
    // Membership check before expensive file parsing. Database writes independently
    // recheck membership and every record permission at transaction time.
    const sites=await call(token,'list_editor_sites',{});
    if(!Array.isArray(sites)||!sites.some(site=>site&&site.id===h.site))throw new CmsGatewayError(403,'You do not have access to this website.');
    const bytes=await fileBytes(request),sourceHash=createHash('sha256').update(bytes).digest('hex');
    if(h.action==='apply'){
      const receipt=await call(token,'get_import_receipt',{p_site:h.site,p_request:h.request}) as {sourceSha256:string;reviewSha256:string;result:unknown}|null;
      if(receipt){
        if(receipt.sourceSha256!==sourceHash||receipt.reviewSha256!==h.review)throw new CmsGatewayError(409,'This import request ID was already used for different content.');
        return Response.json({applied:true,replayed:true,result:receipt.result},{headers:privateHeaders});
      }
    }
    const file=await (h.format==='xlsx'?parseJourneyXlsx:parseJourneyDocx)(bytes);
    const ids=[...new Set((file.input.sheets.Pages||[]).filter(row=>row.operation==='update').map(row=>row.recordId).filter(id=>z.string().uuid().safeParse(id).success))];
    const existing:ReviewRecord[]=[];let totalBytes=0;
    for(let index=0;index<ids.length;index+=10){
      const records=await Promise.all(ids.slice(index,index+10).map(id=>call(token,'get_editor_record',{p_site:h.site,p_record:id})));
      for(const record of records){
        if(!record)continue;
        totalBytes+=Buffer.byteLength(JSON.stringify(record));if(totalBytes>5_000_000)throw new CmsGatewayError(413,'Split this import into smaller batches.');
        const parsed=recordSchema.safeParse(record);if(!parsed.success)throw new CmsGatewayError(422,'An existing record needs migration before importing changes.');
        const r=parsed.data;existing.push({id:r.id,revision:r.currentRevision,slug:r.path.slice('/journeys/'.length),path:r.path,locale:r.locale,title:r.title,payload:r.payload});
      }
    }
    const review=reviewJourneyImport(file.input,existing);
    // Bind acceptance to both original bytes and resulting draft manifest.
    const digest=createHash('sha256').update(`${h.site}:${file.source.sha256}:${review.manifestSha256}`).digest('hex');
    if(h.action==='review'){
      const {manifest:_manifest,manifestSha256:_hash,...display}=review;
      return Response.json({source:file.source,review:display,reviewDigest:digest},{headers:privateHeaders});
    }
    if(!review.valid)return Response.json({error:'Resolve import errors before saving.',issues:review.issues},{status:422,headers:privateHeaders});
    if(h.review!==digest)throw new CmsGatewayError(409,'The reviewed content changed. Review the import again before saving.');
    if(!review.manifest.length)return Response.json({applied:false,unchanged:true,result:[]},{headers:privateHeaders});
    const result=await call(token,'apply_reviewed_import',{p_site:h.site,p_request:h.request,p_source:sourceHash,p_review:digest,p_items:review.manifest});
    return Response.json({applied:true,replayed:false,result},{headers:privateHeaders});
  }catch(error){
    if(error instanceof ImportFileError)return Response.json({error:error.message},{status:422,headers:privateHeaders});
    return cmsErrorResponse(error);
  }
}
