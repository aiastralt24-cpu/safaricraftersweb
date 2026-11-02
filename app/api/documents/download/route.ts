import {handleDocumentDownload} from '@/lib/cms/document-download';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleDocumentDownload(request);}
