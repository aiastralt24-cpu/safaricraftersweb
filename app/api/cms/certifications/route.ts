import {handleCertificationSave} from '../../../../lib/cms/certification-editor-api';
import {handleCertificationLibrary} from '../../../../lib/cms/certification-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleCertificationSave(request);}
export async function GET(request:Request){return handleCertificationLibrary(request);}
