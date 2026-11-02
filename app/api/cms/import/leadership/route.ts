import {handleLeadershipImportUpload} from '../../../../../lib/cms/leadership-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLeadershipImportUpload(request);}
