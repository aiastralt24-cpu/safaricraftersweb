import {handleCareerImportUpload} from '../../../../../lib/cms/career-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleCareerImportUpload(request);}
