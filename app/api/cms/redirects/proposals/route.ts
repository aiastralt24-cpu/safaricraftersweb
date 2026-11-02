import {handleRedirectApproval} from '../../../../../lib/cms/redirect-import-approval-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleRedirectApproval(request);}
