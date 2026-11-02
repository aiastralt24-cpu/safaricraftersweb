import {handleEnquiryFileCleanup,enquiryFileCleanupConfig} from '../../../../../../lib/cms/enquiry-file-cleanup-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){return handleEnquiryFileCleanup(request,enquiryFileCleanupConfig(process.env));}
