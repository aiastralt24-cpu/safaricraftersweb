import {handleAccessRead,handleAccessCommand} from '../../../../lib/cms/access-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAccessRead(request);}
export async function POST(request:Request){return handleAccessCommand(request);}
