import {handleNotificationRoutes} from '@/lib/cms/notification-routes-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNotificationRoutes(request);}
