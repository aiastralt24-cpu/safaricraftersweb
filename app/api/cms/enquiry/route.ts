import {handleEnquiryHttp} from '../../../../lib/cms/enquiry-http';
import {enquiryHttpConfig} from '../../../../lib/cms/enquiry-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){return handleEnquiryHttp(request,enquiryHttpConfig(process.env));}
