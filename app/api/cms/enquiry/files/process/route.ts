import {handleEnquiryFileProcessing} from '../../../../../../lib/cms/enquiry-file-processing-http';
import {enquiryFileProcessingConfig} from '../../../../../../lib/cms/enquiry-file-processing-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request:Request){return handleEnquiryFileProcessing(request,enquiryFileProcessingConfig(process.env));}
