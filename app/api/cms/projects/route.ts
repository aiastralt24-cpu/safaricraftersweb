import {handleProjectLibrary} from '../../../../lib/cms/project-library-api';
import {handleProjectSave} from '../../../../lib/cms/project-editor-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProjectSave(request);}

export async function GET(request:Request){return handleProjectLibrary(request);}
