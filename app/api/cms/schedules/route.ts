import {handlePublicationScheduleCommand,handlePublicationScheduleRead} from '../../../../lib/cms/publication-schedule-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handlePublicationScheduleRead(request);}
export async function POST(request:Request){return handlePublicationScheduleCommand(request);}
