import "server-only";

export type EnquiryStatus = "new" | "contacted" | "qualified" | "closed";

export type EnquiryRecord = {
  id: number;
  enquiry_id: string;
  specialist: string;
  source: string;
  status?: EnquiryStatus;
  created_at: string;
  payload: Record<string, unknown>;
};

export type EnquiryFilters = { query?: string; status?: string };

export async function getEnquiries(filters: EnquiryFilters = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase enquiry access is not configured.");

  const endpoint = new URL(`${url}/rest/v1/safari_enquiries`);
  endpoint.searchParams.set("select", "id,enquiry_id,specialist,source,status,created_at,payload");
  endpoint.searchParams.set("order", "created_at.desc");
  endpoint.searchParams.set("limit", "250");

  const request = () => fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store"
  });
  let response = await request();
  if (!response.ok) {
    endpoint.searchParams.set("select", "id,enquiry_id,specialist,source,created_at,payload");
    response = await request();
  }
  if (!response.ok) throw new Error("Enquiries could not be loaded from Supabase.");

  let records = await response.json() as EnquiryRecord[];
  if (filters.status && filters.status !== "all") {
    records = records.filter((record) => enquiryStatus(record) === filters.status);
  }
  const query = filters.query?.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) => {
    const payload = record.payload;
    return [record.enquiry_id, record.specialist, payload.name, payload.email, payload.region, payload.sourceLabel]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
}

export function enquiryStatus(record: EnquiryRecord): EnquiryStatus {
  return record.status || "new";
}

export function payloadText(payload: Record<string, unknown>, key: string, fallback = "Not provided") {
  const value = payload[key];
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (typeof value === "string" || typeof value === "number") return String(value) || fallback;
  return fallback;
}
