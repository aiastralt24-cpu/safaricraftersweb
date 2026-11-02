import {handleScheduledReleaseCommand,handleScheduledReleaseRead} from '../../../../../lib/cms/scheduled-release-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleScheduledReleaseRead(request);}
export async function POST(request:Request){return handleScheduledReleaseCommand(request);}
