import {handleCareerSave} from '../../../../lib/cms/career-editor-api';
import {handleCareerLibrary} from '../../../../lib/cms/career-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleCareerSave(request);}
export async function GET(request:Request){return handleCareerLibrary(request);}
