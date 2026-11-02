import {handleRoleCommand} from '../../../../../lib/cms/access-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleRoleCommand(request);}
