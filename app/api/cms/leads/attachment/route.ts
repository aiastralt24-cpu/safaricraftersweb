import {handleLeadAttachmentDownload} from '../../../../../lib/cms/lead-attachment-download';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){return handleLeadAttachmentDownload(request);}
