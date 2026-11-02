import {handleScheduleRun,scheduleRuntime} from '@/lib/cms/publication-schedule-runtime';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleScheduleRun(request,scheduleRuntime());}
export async function GET(request:Request){return handleScheduleRun(request,scheduleRuntime());}
