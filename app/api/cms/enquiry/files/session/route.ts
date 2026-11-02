import {handleEnquiryFileSessionHttp} from '../../../../../../lib/cms/enquiry-file-session-http';
import {enquiryFileSessionHttpConfig} from '../../../../../../lib/cms/enquiry-file-session-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){return handleEnquiryFileSessionHttp(request,enquiryFileSessionHttpConfig(process.env));}
