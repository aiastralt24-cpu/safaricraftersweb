import {handleDocumentUploadCommand} from '@/lib/cms/document-upload-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleDocumentUploadCommand(request);}
