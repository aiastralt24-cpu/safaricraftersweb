import {handleApplicationClaimOwners} from '../../../../../lib/cms/application-claim-owners-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleApplicationClaimOwners(request);}
