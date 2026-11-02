import {revalidatePath} from 'next/cache';
import {deliveryRuntime,handleDeliveryRun} from '@/lib/cms/delivery-runtime';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
// Shared records can affect any page, menu, search result or sitemap. Invalidate
// the root layout; requests then read current published state, never job payloads.
export async function POST(request:Request){return handleDeliveryRun(request,deliveryRuntime(()=>revalidatePath('/','layout')));}
export async function GET(request:Request){return POST(request);}
