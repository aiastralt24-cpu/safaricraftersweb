import {handlePageUrlImpact} from '../../../../lib/cms/page-url-impact-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePageUrlImpact(request);}
