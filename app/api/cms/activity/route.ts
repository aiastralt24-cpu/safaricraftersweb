import {handleContentActivity} from '../../../../lib/cms/content-activity-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleContentActivity(request);}
