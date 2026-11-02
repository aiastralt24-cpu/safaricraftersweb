import {handleScheduledReleaseRun,scheduledReleaseRuntime} from '@/lib/cms/scheduled-release-runtime';
export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleScheduledReleaseRun(request,scheduledReleaseRuntime());}
export async function GET(request:Request){return handleScheduledReleaseRun(request,scheduledReleaseRuntime());}
