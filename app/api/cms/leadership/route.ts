import {handleLeadershipSave} from '../../../../lib/cms/leadership-editor-api';
import {handleLeadershipLibrary} from '../../../../lib/cms/leadership-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLeadershipSave(request);}
export async function GET(request:Request){return handleLeadershipLibrary(request);}
