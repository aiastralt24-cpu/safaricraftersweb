import {handleApplicationSave} from '../../../../lib/cms/application-editor-api';
import {handleApplicationLibrary} from '../../../../lib/cms/application-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleApplicationSave(request);}
export async function GET(request:Request){return handleApplicationLibrary(request);}
