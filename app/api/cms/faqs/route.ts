import {handleFaqSave} from '../../../../lib/cms/faq-editor-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleFaqSave(request);}

import {handleFaqLibrary} from '../../../../lib/cms/faq-library-api.ts';
export async function GET(request:Request){return handleFaqLibrary(request);}
