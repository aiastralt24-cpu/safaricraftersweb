import {handleEnquiryFileTransferHttp} from '../../../../../../lib/cms/enquiry-file-transfer-http';
import {enquiryFileTransferHttpConfig} from '../../../../../../lib/cms/enquiry-file-transfer-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){return handleEnquiryFileTransferHttp(request,enquiryFileTransferHttpConfig(process.env));}
