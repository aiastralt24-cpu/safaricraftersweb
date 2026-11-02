import {handleSettingsReview} from '../../../../../lib/cms/settings-review-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleSettingsReview(request);}
