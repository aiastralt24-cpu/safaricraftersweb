import {handlePublicationRelease} from '../../../../../lib/cms/publication-release-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePublicationRelease(request,undefined,'cancel');}
