import {handleLocationImportUpload} from '../../../../../lib/cms/location-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLocationImportUpload(request);}
