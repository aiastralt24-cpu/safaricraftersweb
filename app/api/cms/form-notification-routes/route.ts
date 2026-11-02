import {handleFormNotificationRoutes} from '@/lib/cms/form-notification-routes-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleFormNotificationRoutes(request);}
