import {handleNotificationProbe,notificationProbeRuntime} from '@/lib/cms/notification-probe-runtime';
export const runtime='nodejs';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNotificationProbe(request,notificationProbeRuntime());}
