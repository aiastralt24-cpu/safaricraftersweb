import {handlePageUrlProposal} from '../../../../lib/cms/page-url-proposal-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePageUrlProposal(request);}
