import {handleReferenceCommand} from '../../../../lib/cms/reference-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleReferenceCommand(request);}
