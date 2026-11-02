import {handleStandaloneDeliveryRetry} from '../../../../../lib/cms/standalone-delivery-retry-api';
export async function POST(request:Request){return handleStandaloneDeliveryRetry(request);}
