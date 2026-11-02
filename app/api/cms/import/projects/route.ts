import {handleProjectImportUpload} from '../../../../../lib/cms/project-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProjectImportUpload(request);}
