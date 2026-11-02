import {handlePartnerSave} from '../../../../lib/cms/partner-editor-api';
import {handlePartnerLibrary} from '../../../../lib/cms/partner-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePartnerSave(request);}
export async function GET(request:Request){return handlePartnerLibrary(request);}
