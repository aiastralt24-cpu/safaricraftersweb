import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "safari_admin_session";

export function adminSessionValue(token = process.env.ADMIN_TOKEN) {
  if (!token) return null;
  return createHash("sha256").update(`safari-crafters-admin:${token}`).digest("hex");
}

export function isValidAdminSession(value: string | undefined) {
  const expected = adminSessionValue();
  if (!expected || !value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function authorizeAdmin(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token && process.env.NODE_ENV !== "production") return null;

  const provided =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const session = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === ADMIN_SESSION_COOKIE)?.[1];

  if ((token && provided === token) || isValidAdminSession(session)) return null;

  return NextResponse.json(
    { ok: false, error: "Unauthorized. Set ADMIN_TOKEN and send it as x-admin-token." },
    { status: 401 },
  );
}
