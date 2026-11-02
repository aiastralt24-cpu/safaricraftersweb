import {handleDocumentFileCommand} from '@/lib/cms/document-file-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleDocumentFileCommand(request);}
