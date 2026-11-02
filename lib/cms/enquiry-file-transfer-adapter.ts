import type {EnquiryFileTransferAdapter} from './enquiry-file-transfer.ts';
import type {EnquiryRpc} from './enquiry-database.ts';
import type {createEnquiryFileStorageAdapter} from './enquiry-file-storage-adapter.ts';
/** Trusted server wiring. The RPC and storage must target the same deployment. */
export function createEnquiryFileTransferAdapter(rpc:EnquiryRpc,storage:Pick<ReturnType<typeof createEnquiryFileStorageAdapter>,'putOriginal'>):EnquiryFileTransferAdapter{
 return {
  authorize:(i,hash)=>rpc('get_enquiry_file_transfer',{p_site:i.site,p_form:i.form,p_revision:i.revision,p_request:i.request,p_session:i.session,p_token_hash:hash,p_upload:i.upload}),
  put:(transfer,bytes)=>storage.putOriginal(transfer,bytes),
  confirm:(i,hash,sha256,bytes)=>rpc('confirm_enquiry_file',{p_site:i.site,p_session:i.session,p_token_hash:hash,p_upload:i.upload,p_sha256:sha256,p_bytes:bytes}),
 };
}
