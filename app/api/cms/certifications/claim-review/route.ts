import {handleCertificationClaimReview} from '../../../../../lib/cms/certification-claim-review-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleCertificationClaimReview(request);}
