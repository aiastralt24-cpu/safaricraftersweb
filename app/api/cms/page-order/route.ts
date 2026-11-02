import {handlePageOrder} from '../../../../lib/cms/page-order-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePageOrder(request);}
