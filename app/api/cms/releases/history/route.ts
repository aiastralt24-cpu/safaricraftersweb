import {handleReleaseHistoryRead} from '../../../../../lib/cms/release-history-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleReleaseHistoryRead(request);}
