import {handleMediaCommand} from '../../../../lib/cms/media-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleMediaCommand(request);}
