import {handleNotificationReconciliation,notificationReconciliationRuntime} from '@/lib/cms/notification-reconciliation-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){return handleNotificationReconciliation(request,notificationReconciliationRuntime());}
