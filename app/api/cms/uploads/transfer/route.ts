import {handleUploadTransfer} from '../../../../../lib/cms/upload-transfer.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleUploadTransfer(request);}
