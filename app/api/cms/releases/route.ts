import {handlePublicationRelease} from '../../../../lib/cms/publication-release-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePublicationRelease(request);}
import {handleReleaseDeliveryRead} from '../../../../lib/cms/release-delivery-api.ts';
export async function GET(request:Request){return handleReleaseDeliveryRead(request);}
