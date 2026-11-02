import {handleDocumentPreview} from '@/lib/cms/document-preview';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleDocumentPreview(request);}
