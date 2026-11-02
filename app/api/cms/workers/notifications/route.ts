import {handleNotificationRun,notificationRuntime} from '@/lib/cms/lead-notification-runtime';
export const runtime='nodejs';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNotificationRun(request,notificationRuntime());}
