import { createHash } from "node:crypto";
import type { EnquiryPayload } from "./data";

export function validateEnquiry(value: unknown) {
  const fields: Record<string, string> = {};
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const payload: Record<string, unknown> = {};
  const strings: Record<string, number> = { name:120, email:254, region:120, year:40, nights:40, travellers:40, occasion:160, flexibility:160, accommodation:160, investment:160, contactPreference:40, phone:60, city:120, notes:5000, specialist:120, sourceLabel:300, sourceType:60, expeditionSlug:160, departure:120 };
  for (const [key, max] of Object.entries(strings)) {
    const value = input[key];
    if (value !== undefined && (typeof value !== "string" || value.length > max)) fields[key] = `Please use text shorter than ${max} characters.`;
    else payload[key] = typeof value === "string" ? value.trim() : "";
  }
  for (const key of ["types", "experiences", "months"]) {
    const list = input[key];
    if (!Array.isArray(list) || !list.length || list.length > 20 || list.some(v => typeof v !== "string" || !v.trim() || v.length > 160)) fields[key] = "Please select a valid option.";
    else payload[key] = [...new Set(list.map(v => v.trim()))];
  }
  if (input.source !== "planner") fields.source = "Invalid source.";
  if (!payload.name) fields.name = "Please share your name.";
  if (typeof payload.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) fields.email = "Please use a valid email address.";
  if (!payload.phone && !fields.phone) fields.phone = "Please enter your phone number.";
  if (!payload.region) fields.region = "Please choose a region.";
  if (input.consent !== true) fields.consent = "Consent is required so we can respond.";
  if (input.website) fields.website = "Unable to accept this submission.";
  return Object.keys(fields).length ? { ok: false as const, fields } : { ok: true as const, payload: { ...payload, source: "planner", consent: true } as EnquiryPayload };
}

export async function database(path: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Enquiry database is not configured");
  return fetch(`${url}/rest/v1/${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000), headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", ...init.headers } });
}

export async function acceptEnquiry(payload: EnquiryPayload, submissionId: string) {
  const specialist = payload.types.includes("Photo-led") ? "Gaurav" : "Safari Crafters";
  const response = await database("rpc/accept_safari_enquiry", { method:"POST", body:JSON.stringify({ p_key:submissionId, p_hash:createHash("sha256").update(JSON.stringify(payload)).digest("hex"), p_payload:payload, p_specialist:specialist }) });
  if (!response.ok) {
    const error = await response.json().catch(()=>({}));
    if (error.message === "rate_limited") return { status:429, error:"Please wait a few minutes before sending another enquiry." };
    if (error.message === "submission_conflict") return { status:409, error:"This request was already received with different details. Please contact us to update it." };
    throw new Error("Enquiry storage failed");
  }
  const result = await response.json();
  return { status:200, enquiryId:result.enquiry_id as string, specialist:result.specialist as string };
}

// Notification copy is deliberately curated: stored metadata stays in the portal.
export function formatTeamEnquiryEmail(payload: EnquiryPayload & { sourceType?: string; departure?: string }, reference: string) {
  const placeholders = new Set([
    "to confirm", "to discuss", "prefer to discuss", "not decided yet", "not applicable",
    "as per confirmed programme", "flexible", "current", "surprise me", "open to suggestions",
    "selected departure", "auto-route"
  ]);
  const detail = (value: unknown): string => {
    if (Array.isArray(value)) return [...new Set(value.map(detail).filter(Boolean))].join(", ");
    if (typeof value !== "string") return "";
    const text = value.trim();
    return placeholders.has(text.toLowerCase()) ? "" : text;
  };
  const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
  const contact = [
    ["Name", payload.name], ["Phone", payload.phone], ["Email", payload.email], ["City", payload.city]
  ].filter(([, value]) => typeof value === "string" && value.trim())
    .map(([label, value]) => `${label}: ${singleLine(value!)}`);
  const isContact = payload.sourceType === "contact";
  const isStore = payload.sourceType === "store-international";
  const departure = detail(payload.departure);
  let journey = isContact ? "" : detail(payload.sourceLabel);
  if (departure && journey.endsWith(` · ${departure}`)) journey = journey.slice(0, -(` · ${departure}`).length);
  const dates = departure || detail(payload.months);
  const details: string[] = [];
  const add = (label: string, value: unknown) => {
    const text = detail(value);
    if (text) details.push(`${label}: ${singleLine(text)}`);
  };
  add("Journey", journey);
  if (!isContact && !isStore && payload.region !== "Photo Expedition") add("Destination", payload.region);
  add("Travel dates", dates);
  const year = detail(payload.year);
  if (year && !dates.includes(year)) add("Year", year);
  add("Travellers", payload.travellers);
  const nights = detail(payload.nights);
  if (nights) add("Duration", /^\d+$/.test(nights) ? `${nights} ${nights === "1" ? "night" : "nights"}` : nights);
  // Contact and store forms populate these fields internally, not from guest choices.
  if (!isContact && !isStore) {
    add("Safari style", payload.types);
    add("Interests", payload.experiences);
    add("Occasion", payload.occasion);
    if (detail(payload.flexibility) !== dates) add("Date flexibility", payload.flexibility);
    add("Budget per person", payload.investment);
    add("Preferred contact", payload.contactPreference);
  }
  add("Accommodation", payload.accommodation);
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const text = [
    "New Safari Crafters enquiry",
    contact.join("\n"),
    details.length ? `Enquiry details\n${details.join("\n")}` : "",
    notes ? `Guest message\n${notes}` : "",
    "View and manage this lead: https://www.safaricrafters.com/admin/enquiries",
    `Reference: ${reference}`
  ].filter(Boolean).join("\n\n");
  const subject = `New enquiry: ${singleLine(payload.name)}${journey ? ` · ${singleLine(journey)}` : " · Safari Crafters"}`.slice(0, 200);
  return { subject, text };
}

export async function deliverEnquiryEmails() {
  const result = { processed: 0, failed: 0 };
  // The database leases two notifications at a time (one enquiry's emails).
  // Continue past older jobs so each submission can also deliver its own emails.
  // Keep claiming bounded and leave time for the final batch within maxDuration.
  const claimDeadline = Date.now() + 5000;
  for (let batch = 0; batch < 10; batch++) {
    const next = await deliverEnquiryEmailBatch();
    result.processed += next.processed;
    result.failed += next.failed;
    if (!next.processed || Date.now() >= claimDeadline) break;
  }
  return result;
}

async function deliverEnquiryEmailBatch() {
  const response = await database("rpc/claim_safari_notifications", { method:"POST", body:"{}" });
  if (!response.ok) throw new Error("Notification queue unavailable");
  const jobs = await response.json() as {id:number; enquiry_id:string; kind:string; attempts:number; lease_token:string; payload:EnquiryPayload}[];
  let failed = 0;
  for (const job of jobs) {
    try {
      const from = process.env.ENQUIRY_FROM_EMAIL;
      const to = job.kind === "guest"
        ? [job.payload.email]
        : [...new Set([...(process.env.ENQUIRY_TO_EMAIL || "").split(","), "info@safaricrafters.com"].map(email => email.trim().toLowerCase()).filter(Boolean))];
      if (!from || !to.length || !process.env.RESEND_API_KEY) throw new Error("Email configuration missing");
      const message = job.kind === "guest"
        ? {
            subject: "We’ve received your enquiry · Safari Crafters",
            text: `Dear ${job.payload.name},\n\nYour enquiry has been saved.\nReference: ${job.enquiry_id}\nJourney: ${job.payload.sourceLabel || job.payload.region}\n\nOur team will review your request and respond with the next steps.\n\nSafari Crafters`
          }
        : formatTeamEnquiryEmail(job.payload, job.enquiry_id);
      const email = await fetch("https://api.resend.com/emails", { method:"POST", signal:AbortSignal.timeout(10000), headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json", "Idempotency-Key":`${job.enquiry_id}-${job.kind}`}, body:JSON.stringify({from,to,reply_to:job.payload.email,...message}) });
      if (!email.ok) throw new Error(`Email provider returned ${email.status}`);
      const ack = await database(`safari_notification_outbox?id=eq.${job.id}&lease_token=eq.${job.lease_token}`, {method:"PATCH",body:JSON.stringify({sent_at:new Date().toISOString(),last_error:null,lease_until:null})});
      if (!ack.ok) throw new Error("Delivery acknowledgement failed");
    } catch {
      failed++;
      // No guest details or email contents in logs.
      console.error("enquiry_notification_failed", {reference:job.enquiry_id,kind:job.kind});
      await database(`safari_notification_outbox?id=eq.${job.id}&lease_token=eq.${job.lease_token}`, {method:"PATCH",body:JSON.stringify({last_error:"Delivery failed; review email configuration/provider and retry queue.",lease_until:null,next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString()})}).catch(()=>{});
    }
  }
  return { processed:jobs.length, failed };
}
