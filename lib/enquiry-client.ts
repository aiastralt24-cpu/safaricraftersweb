const inMemoryKeys = new Map<string,string>();
// Keep one key for the same attempted submission, including network retries/reloads.
// Only the random key and a digest are stored; no contact details are persisted.
export async function enquiryHeaders(payload: unknown): Promise<Record<string,string>> {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(payload)));
  const fingerprint = Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("");
  const storageKey = `safari-enquiry:${fingerprint}`;
  let key: string | null = null;
  try {key=sessionStorage.getItem(storageKey);} catch {}
  if (!key) {key=inMemoryKeys.get(fingerprint) || crypto.randomUUID();inMemoryKeys.set(fingerprint,key);try {sessionStorage.setItem(storageKey,key);} catch {}}
  return {"Content-Type":"application/json","Idempotency-Key":key};
}
