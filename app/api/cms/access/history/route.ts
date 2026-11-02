import {handleAccessHistory} from '../../../../../lib/cms/access-history.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAccessHistory(request);}
