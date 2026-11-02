import {handleRevisionHistory} from '../../../../lib/cms/revision-history-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleRevisionHistory(request);}
