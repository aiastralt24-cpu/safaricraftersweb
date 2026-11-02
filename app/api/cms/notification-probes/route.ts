import {handleNotificationProbeAdmin} from '@/lib/cms/notification-probe-admin-api';
export const runtime='nodejs';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNotificationProbeAdmin(request);}
