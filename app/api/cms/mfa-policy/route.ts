import {handleMfaPolicy} from '../../../../lib/cms/mfa-policy-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleMfaPolicy(request);}
