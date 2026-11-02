import {handlePublicExpeditionDirectory,publicExpeditionDirectoryConfig} from '../../../../../lib/cms/expedition-directory-runtime';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handlePublicExpeditionDirectory(request,publicExpeditionDirectoryConfig());}
