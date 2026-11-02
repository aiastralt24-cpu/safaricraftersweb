import {handleSettingsRead} from '../../../../lib/cms/settings-api.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleSettingsRead(request);}
