import {handleUploadCommand} from '../../../../lib/cms/upload-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleUploadCommand(request);}
