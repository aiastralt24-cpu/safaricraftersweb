import {handleSiteRedirectExport} from '../../../../../lib/cms/site-redirect-export-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleSiteRedirectExport(request);}
