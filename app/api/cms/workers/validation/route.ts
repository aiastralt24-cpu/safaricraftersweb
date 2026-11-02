import {handleValidationRun,validationRuntime} from '@/lib/cms/validation-runtime';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleValidationRun(request,validationRuntime());}
export async function GET(request:Request){return handleValidationRun(request,validationRuntime());}
