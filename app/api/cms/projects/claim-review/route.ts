import {handleClaimReview} from '../../../../../lib/cms/project-claim-review-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleClaimReview(request);}
