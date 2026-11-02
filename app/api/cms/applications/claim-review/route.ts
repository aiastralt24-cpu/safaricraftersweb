import {handleApplicationClaimReview} from '../../../../../lib/cms/application-claim-review-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleApplicationClaimReview(request);}
