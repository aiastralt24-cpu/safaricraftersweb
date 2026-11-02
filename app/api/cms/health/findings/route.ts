import {handleFindingsReport} from '../../../../../lib/cms/validation-findings-report-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleFindingsReport(request);}
