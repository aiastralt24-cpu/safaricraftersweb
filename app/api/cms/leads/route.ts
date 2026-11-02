import {handleLeadCommand} from '../../../../lib/cms/leads-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLeadCommand(request);}
