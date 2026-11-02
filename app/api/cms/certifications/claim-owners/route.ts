import {handleCertificationClaimOwners} from '../../../../../lib/cms/certification-claim-owners-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleCertificationClaimOwners(request);}
