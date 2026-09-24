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

export async function deliverEnquiryEmails() {
  const response = await database("rpc/claim_safari_notifications", { method:"POST", body:"{}" });
  if (!response.ok) throw new Error("Notification queue unavailable");
  const jobs = await response.json() as {id:number; enquiry_id:string; kind:string; attempts:number; lease_token:string; payload:EnquiryPayload}[];
  let failed = 0;
  for (const job of jobs) {
    try {
      const from = process.env.ENQUIRY_FROM_EMAIL;
      const to = job.kind === "guest" ? job.payload.email : process.env.ENQUIRY_TO_EMAIL;
      if (!from || !to || !process.env.RESEND_API_KEY) throw new Error("Email configuration missing");
      const body = job.kind === "guest"
        ? `Dear ${job.payload.name},\n\nYour enquiry has been saved.\nReference: ${job.enquiry_id}\nJourney: ${job.payload.sourceLabel || job.payload.region}\n\nOur team will review your request and respond with the next steps.\n\nSafari Crafters`
        : [`Reference: ${job.enquiry_id}`, ...Object.entries(job.payload).map(([key,value])=>`${key}: ${Array.isArray(value)?value.join(", "):value}`)].join("\n");
      const email = await fetch("https://api.resend.com/emails", { method:"POST", signal:AbortSignal.timeout(10000), headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json", "Idempotency-Key":`${job.enquiry_id}-${job.kind}`}, body:JSON.stringify({from,to:[to],reply_to:job.payload.email,subject:`${job.enquiry_id} · Safari Crafters enquiry`,text:body}) });
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
