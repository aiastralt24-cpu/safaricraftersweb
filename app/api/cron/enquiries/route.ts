import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverEnquiryEmails } from "@/lib/enquiry-service";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  const received = request.headers.get("authorization") || "";
  if (!expected || expected.length!==received.length || !timingSafeEqual(Buffer.from(expected),Buffer.from(received))) return new Response(null,{status:401});
  try {const result=await deliverEnquiryEmails();return NextResponse.json(result,{status:result.failed?503:200});}
  catch {return NextResponse.json({error:"Notification queue unavailable"},{status:503});}
}

export const maxDuration = 60;
