import {handleProbeReconciliation,probeReconciliationRuntime} from '@/lib/cms/notification-probe-reconciliation-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProbeReconciliation(request,probeReconciliationRuntime());}
