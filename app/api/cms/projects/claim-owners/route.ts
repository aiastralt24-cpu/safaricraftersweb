import {handleProjectClaimOwners} from '../../../../../lib/cms/project-claim-owners-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProjectClaimOwners(request);}
