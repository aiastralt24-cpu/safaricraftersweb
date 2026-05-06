import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const source = String(data.source || "unknown");
  const specialist = routeSpecialist(data);

  // Replace this stub with Supabase, HubSpot, Resend and Slack integrations.
  console.info("Safari Crafters enquiry", {
    source,
    specialist,
    createdAt: new Date().toISOString()
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, specialist });
  }

  return NextResponse.redirect(new URL(`/plan?submitted=1&specialist=${specialist}`, request.url), {
    status: 303
  });
}

function routeSpecialist(data: Record<string, unknown>) {
  const text = JSON.stringify(data).toLowerCase();
  if (text.includes("photo") || text.includes("tiger") || text.includes("bird")) return "Gaurav";
  if (text.includes("africa") || text.includes("mara") || text.includes("kenya")) return "Kairav";
  if (text.includes("india") || text.includes("ranthambhore") || text.includes("bandhavgarh")) return "Kairav";
  return "Safari Crafters";
}
