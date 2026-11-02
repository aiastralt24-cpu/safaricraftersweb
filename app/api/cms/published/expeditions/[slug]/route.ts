import {handlePublishedExpedition,publicExpeditionConfig} from '../../../../../../lib/cms/public-expedition-runtime.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return handlePublishedExpedition(request,(await params).slug,publicExpeditionConfig());}
