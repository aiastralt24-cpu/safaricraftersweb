import {handleScheduleMonitor} from '../../../../../lib/cms/schedule-monitor-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleScheduleMonitor(request);}
