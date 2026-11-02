import {handlePageHierarchy} from '../../../../lib/cms/page-hierarchy-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePageHierarchy(request);}
