import {handleTranslations} from '../../../../lib/cms/translation-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleTranslations(request);}
