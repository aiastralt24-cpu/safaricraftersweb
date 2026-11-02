import {handleEnquiryFileControlsHttp} from '../../../../../../lib/cms/enquiry-file-controls-http';
import {enquiryFileControlsHttpConfig} from '../../../../../../lib/cms/enquiry-file-controls-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){return handleEnquiryFileControlsHttp(request,enquiryFileControlsHttpConfig(process.env));}
