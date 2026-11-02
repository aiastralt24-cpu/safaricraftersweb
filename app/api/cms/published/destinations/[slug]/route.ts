import {handlePublishedDestination,publicDestinationConfig} from '../../../../../../lib/cms/public-destination-runtime.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return handlePublishedDestination(request,(await params).slug,publicDestinationConfig());}
