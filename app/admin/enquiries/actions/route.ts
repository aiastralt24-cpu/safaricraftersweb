import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { database } from "@/lib/enquiry-service";

export async function POST(request: Request) {
  const denied = authorizeAdmin(request);
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const action = String(form.get("action") || "status");
  const status = String(form.get("status") || "");
  if (!/^SC-[A-Z0-9-]+$/.test(id) || !["status", "trash", "restore"].includes(action)
    || (action === "status" && !["new", "contacted", "qualified", "booked", "closed"].includes(status))
    || (action === "trash" && form.get("confirm") !== "yes")) return new Response(null, { status: 400 });
  const redirect = (notice: string, trash = false) => {
    const url = new URL("/admin/enquiries", request.url);
    url.searchParams.set("notice", notice);
    if (trash) url.searchParams.set("view", "trash");
    if (action !== "trash") url.searchParams.set("selected", id);
    return NextResponse.redirect(url, 303);
  };
  try {
    const read = await database(`safari_enquiries?enquiry_id=eq.${id}&select=payload,updated_at`);
    if (!read.ok) throw new Error();
    const [record] = await read.json();
    if (!record) return redirect("missing");
    if (action === "status" && record.payload._deletedAt) return redirect("trashed", true);
    const payload = { ...record.payload };
    if (action === "trash") payload._deletedAt = new Date().toISOString();
    if (action === "restore") delete payload._deletedAt;
    const query = new URLSearchParams({ enquiry_id: `eq.${id}`, updated_at: record.updated_at ? `eq.${record.updated_at}` : "is.null" });
    const result = await database(`safari_enquiries?${query}`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...(action === "status" ? { status } : { payload }), updated_at: new Date().toISOString() })
    });
    if (!result.ok) throw new Error();
    if (!(await result.json()).length) return redirect("conflict", action === "restore");
    return redirect(action === "trash" ? "deleted" : action === "restore" ? "restored" : "saved");
  } catch {
    return redirect("error", action === "restore");
  }
}
