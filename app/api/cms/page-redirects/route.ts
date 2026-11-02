import {handlePageRedirectManagement} from '../../../../lib/cms/page-redirect-management-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePageRedirectManagement(request);}
