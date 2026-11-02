import {handleMediaRightsMonitor} from '../../../../../lib/cms/media-rights-monitor-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleMediaRightsMonitor(request);}
