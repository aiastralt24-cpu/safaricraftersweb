import {handlePreviewManagement} from '../../../../lib/cms/preview-management-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePreviewManagement(request);}
