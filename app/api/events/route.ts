import { readLimitedBody } from "@/lib/request-body";
import { NextResponse } from "next/server";
import { database } from "@/lib/enquiry-service";
export async function POST(request:Request) {
  if (request.headers.get("origin")!==new URL(request.url).origin) return new Response(null,{status:403});
  if (Number(request.headers.get("content-length"))>1000) return new Response(null,{status:413});
  try {
    const text=await readLimitedBody(request,1000);
    const {event,path,visit}=JSON.parse(text);
    if (!["trip_viewed","planner_started","enquiry_started","enquiry_failed"].includes(event) || typeof path!=="string" || !/^\/[a-z0-9/\-]*$/.test(path) || path.length>200 || typeof visit!=="string" || !/^[a-f\d-]{36}$/.test(visit)) return new Response(null,{status:400});
    const result=await database("rpc/record_safari_event",{method:"POST",body:JSON.stringify({p_event:event,p_path:path,p_visit:visit})});
    return new Response(null,{status:result.ok?204:503});
  } catch {return NextResponse.json({ok:false},{status:503});}
}
