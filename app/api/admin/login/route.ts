import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminSessionValue } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const provided = String(form.get("token") || "");
  const configured = process.env.ADMIN_TOKEN;

  if (!configured || provided !== configured) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("error", configured ? "invalid" : "unconfigured");
    return NextResponse.redirect(login, 303);
  }

  const response = NextResponse.redirect(new URL("/admin/enquiries", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(configured)!, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/admin", maxAge: 60 * 60 * 12
  });
  return response;
}
