import { readLimitedBody } from "@/lib/request-body";
import { NextResponse, after } from "next/server";
import { acceptEnquiry, deliverEnquiryEmails, validateEnquiry } from "@/lib/enquiry-service";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ok:false,error:"Invalid request origin."},{status:403});
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(key)) return NextResponse.json({ok:false,error:"Please reload the form and try again."},{status:400});
  let raw: string;
  try {
    raw = await readLimitedBody(request, 20000);
  } catch { return NextResponse.json({ok:false,error:"Request is too large."},{status:413}); }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return NextResponse.json({ok:false,error:"The enquiry could not be read."},{status:400}); }
  const validation = validateEnquiry(value);
  if (!validation.ok) return NextResponse.json({ok:false,error:"Please review your details.",fields:validation.fields},{status:400});
  try {
    const result = await acceptEnquiry(validation.payload,key);
    if (result.status !== 200) return NextResponse.json({ok:false,error:result.error},{status:result.status,headers:result.status===429?{"Retry-After":"600"}:{}});
    after(async()=>{try {await deliverEnquiryEmails();} catch {console.error("enquiry_notification_queue_unavailable");}});
    return NextResponse.json({ok:true,enquiryId:result.enquiryId,specialist:result.specialist});
  } catch {
    console.error("enquiry_storage_unavailable");
    return NextResponse.json({ok:false,error:"We could not confirm your enquiry was saved. Please retry; we will not create a duplicate. You can also email hello@safaricrafters.com."},{status:503});
  }
}

export const maxDuration = 60;
