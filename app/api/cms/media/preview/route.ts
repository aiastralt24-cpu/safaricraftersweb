import {handleMediaPreview} from '../../../../../lib/cms/media-preview.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleMediaPreview(request);}
