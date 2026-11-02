import {handleRedirectImportReview} from '../../../../../lib/cms/redirect-import-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleRedirectImportReview(request);}
