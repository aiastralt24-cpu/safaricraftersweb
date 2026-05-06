import { NextResponse } from "next/server";

export function authorizeAdmin(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token && process.env.NODE_ENV !== "production") return null;

  const provided =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token && provided === token) return null;

  return NextResponse.json(
    { ok: false, error: "Unauthorized. Set ADMIN_TOKEN and send it as x-admin-token." },
    { status: 401 },
  );
}
