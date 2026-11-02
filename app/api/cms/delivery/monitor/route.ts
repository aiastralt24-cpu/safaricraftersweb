import {handleDeliveryMonitor} from '../../../../../lib/cms/delivery-monitor-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleDeliveryMonitor(request);}
