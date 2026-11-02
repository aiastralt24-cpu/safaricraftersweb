import {handleContentHealthRead} from '../../../../lib/cms/content-health-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleContentHealthRead(request);}
