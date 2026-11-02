import {handleEventSave} from '../../../../lib/cms/event-editor-api';
import {handleEventLibrary} from '../../../../lib/cms/event-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleEventSave(request);}
export async function GET(request:Request){return handleEventLibrary(request);}
