import { NextResponse } from "next/server";
import type { EnquiryPayload } from "@/lib/data";

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "The private brief could not be read." }, { status: 400 });
  }

  const validation = validatePayload(data);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: "Please review the highlighted details.", fields: validation.fields }, { status: 400 });
  }

  const enquiry = validation.payload;
  const enquiryId = `SC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const specialist = routeSpecialist(enquiry);

  try {
    await Promise.all([
      storeEnquiry(enquiryId, specialist, enquiry),
      notifyReservations(enquiryId, specialist, enquiry),
      sendGuestConfirmation(enquiryId, specialist, enquiry)
    ]);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Your brief could not be delivered just now. Please retry, or contact Safari Crafters directly." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, enquiryId, specialist });
}

function validatePayload(value: unknown): { ok: true; payload: EnquiryPayload } | { ok: false; fields: Record<string, string> } {
  const data = value as Partial<EnquiryPayload> | null;
  const fields: Record<string, string> = {};
  if (!data || data.source !== "planner") fields.source = "Invalid enquiry source.";
  if (!data?.name?.trim()) fields.name = "Please share your name.";
  if (!data?.email || !/^\S+@\S+\.\S+$/.test(data.email)) fields.email = "Please use a valid email address.";
  if (!data?.region) fields.region = "Please choose a region.";
  if (!Array.isArray(data?.types) || !data.types.length) fields.types = "Please choose a journey style.";
  if (!Array.isArray(data?.experiences) || !data.experiences.length) fields.experiences = "Please choose at least one interest.";
  if (!data?.consent) fields.consent = "Consent is required so we can respond.";
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, payload: data as EnquiryPayload };
}

async function storeEnquiry(enquiryId: string, specialist: string, enquiry: EnquiryPayload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Enquiry storage is not configured.");
  const response = await fetch(`${url}/rest/v1/safari_enquiries`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ enquiry_id: enquiryId, specialist, source: enquiry.source, payload: enquiry })
  });
  if (!response.ok) throw new Error("Enquiry storage failed.");
}

async function notifyReservations(enquiryId: string, specialist: string, enquiry: EnquiryPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  const to = process.env.ENQUIRY_TO_EMAIL;
  if (!apiKey || !from || !to) throw new Error("Enquiry email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": enquiryId
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: enquiry.email,
      subject: `${enquiryId} · ${enquiry.region} private safari brief`,
      text: formatBrief(enquiryId, specialist, enquiry)
    })
  });
  if (!response.ok) throw new Error("Enquiry notification failed.");
}

async function sendGuestConfirmation(enquiryId: string, specialist: string, enquiry: EnquiryPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Enquiry email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${enquiryId}-guest`
    },
    body: JSON.stringify({
      from,
      to: [enquiry.email],
      subject: `${enquiryId} · Your Safari Crafters brief`,
      text: [
        `Dear ${enquiry.name},`,
        "",
        "Your private travel brief has reached Safari Crafters.",
        `Reference: ${enquiryId}`,
        `Journey: ${enquiry.sourceLabel || enquiry.region}`,
        `Specialist: ${specialist}`,
        "",
        "A specialist will review the season, access and field priorities before responding with considered next steps.",
        "",
        "Safari Crafters"
      ].join("\n")
    })
  });
  if (!response.ok) throw new Error("Guest confirmation failed.");
}

function formatBrief(enquiryId: string, specialist: string, enquiry: EnquiryPayload) {
  return [
    `Private brief: ${enquiryId}`,
    `Assigned specialist: ${specialist}`,
    `Started from: ${enquiry.sourceLabel || "Direct planner"}`,
    "",
    `Guest: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || "Not provided"}`,
    `City: ${enquiry.city || "Not provided"}`,
    `Preferred contact: ${enquiry.contactPreference}`,
    "",
    `Region: ${enquiry.region}`,
    `Journey style: ${enquiry.types.join(", ")}`,
    `Interests: ${enquiry.experiences.join(", ")}`,
    `Occasion: ${enquiry.occasion}`,
    `Timing: ${enquiry.months.join(", ")} ${enquiry.year} · ${enquiry.flexibility}`,
    `Length: ${enquiry.nights}+ nights · ${enquiry.travellers} guests`,
    `Accommodation: ${enquiry.accommodation}`,
    `Investment: ${enquiry.investment}`,
    "",
    `Notes: ${enquiry.notes || "None"}`
  ].join("\n");
}

function routeSpecialist(data: EnquiryPayload) {
  const text = JSON.stringify(data).toLowerCase();
  if (text.includes("photo") || text.includes("tiger") || text.includes("bird")) return "Gaurav";
  if (text.includes("africa") || text.includes("mara") || text.includes("kenya")) return "Kairav";
  if (text.includes("india") || text.includes("ranthambhore") || text.includes("bandhavgarh")) return "Kairav";
  return "Safari Crafters";
}
