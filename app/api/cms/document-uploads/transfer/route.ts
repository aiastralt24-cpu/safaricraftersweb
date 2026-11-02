import {handleDocumentTransfer} from '@/lib/cms/document-transfer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleDocumentTransfer(request);}
