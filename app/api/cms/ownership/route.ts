import {handleRecordOwnership} from '../../../../lib/cms/record-ownership-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleRecordOwnership(request);}
