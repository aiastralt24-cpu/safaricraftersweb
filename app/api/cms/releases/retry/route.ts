import {handleDeliveryRetry} from '../../../../../lib/cms/release-delivery-retry-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleDeliveryRetry(request);}
