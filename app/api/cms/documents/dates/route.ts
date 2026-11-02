import {handleDocumentDateMonitor} from '../../../../../lib/cms/document-date-monitor-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleDocumentDateMonitor(request);}
