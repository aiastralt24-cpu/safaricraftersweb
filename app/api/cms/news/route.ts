import {handleNewsSave} from '../../../../lib/cms/news-editor-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNewsSave(request);}

import {handleNewsLibrary} from '../../../../lib/cms/news-library-api.ts';
export async function GET(request:Request){return handleNewsLibrary(request);}
