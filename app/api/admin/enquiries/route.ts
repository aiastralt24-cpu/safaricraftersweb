import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { database } from "@/lib/enquiry-service";
export async function POST(request:Request) {
 const denied=authorizeAdmin(request);if(denied)return denied;
 if(request.headers.get("origin")!==new URL(request.url).origin)return new Response(null,{status:403});
 const form=await request.formData();const id=String(form.get("id")||"");const status=String(form.get("status")||"");
 if(!/^SC-[A-Z0-9-]+$/.test(id)||!["new","contacted","qualified","booked","closed"].includes(status))return new Response(null,{status:400});
 try {const result=await database(`safari_enquiries?enquiry_id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status,updated_at:new Date().toISOString()})});if(!result.ok)throw new Error();return NextResponse.redirect(new URL(`/admin/enquiries?selected=${id}`,request.url),303);}
 catch{return NextResponse.json({error:"Status could not be saved. Please return to the inbox and retry."},{status:503});}
}
