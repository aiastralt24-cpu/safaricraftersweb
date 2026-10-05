import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE,isValidAdminSession } from "@/lib/admin-auth";
import { database } from "@/lib/enquiry-service";
import { expeditions } from "@/lib/data";
import { upcomingDepartures } from "@/lib/departures";
export const dynamic="force-dynamic";
export default async function Operations() {
 if(!isValidAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))redirect('/admin/login');
 const required=["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","RESEND_API_KEY","ENQUIRY_FROM_EMAIL","ENQUIRY_TO_EMAIL","CRON_SECRET"];
 let queue: {enquiry_id:string;kind:string;attempts:number;last_error:string;created_at:string}[]=[];
 let events: {event:string}[]=[];let error="";
 try {
 const since=new Date(Date.now()-30*86400000).toISOString();
 const results=await Promise.all([database('safari_notification_outbox?sent_at=is.null&select=enquiry_id,kind,attempts,last_error,created_at&order=created_at.asc&limit=100'),database(`safari_funnel_events?created_at=gte.${since}&select=event&limit=10000`)]);
 if(results.some(r=>!r.ok))throw new Error();[queue,events]=await Promise.all(results.map(r=>r.json()));
 }catch{error="Database checks unavailable. Configure Supabase and apply the reliability migration.";}
 return <section className="section"><div className="container"><p className="eyebrow">Operations</p><h1 className="h2">Launch & delivery checks</h1><p><Link href="/admin/enquiries">Enquiry inbox</Link> · <Link href="/admin">Content publishing</Link></p>
 <h2>Configuration</h2><ul>{required.map(k=><li key={k}>{k}: {process.env[k]?"Configured":"Missing"}</li>)}</ul><p>Configured means present, not verified. Test provider delivery before launch.</p>
 {error&&<p role="alert">{error}</p>}<h2>Unsent notifications ({queue.length}{queue.length===100?"+":""})</h2><p>Items retry automatically up to 10 attempts. A configured scheduler must call the retry endpoint every five minutes. Monitor its non-200 responses.</p><ul>{queue.map(j=><li key={j.enquiry_id+j.kind}>{j.enquiry_id} · {j.kind} · {j.attempts} attempts · {j.last_error||"Pending"}{j.attempts>=10?" · Manual investigation required":""}</li>)}</ul>
 <h2>Funnel activity · last 30 days</h2><p>Counts reflect recorded events, capped at 10,000 rows. Sessions can opt out; these are not exact visitor totals. Saved and booked leads are in the inbox.</p><ul>{["trip_viewed","planner_started","enquiry_started","enquiry_failed"].map(e=><li key={e}>{e}: {events.filter(v=>v.event===e).length}</li>)}</ul>
 <h2>Departure review</h2><ul>{expeditions.map(e=><li key={e.slug}>{e.title} · {e.publicationStatus||"Review needed"} · {upcomingDepartures(e).length} upcoming departures · availability reviewed: {e.availabilityReviewedAt||"Not recorded"}</li>)}</ul>
 </div></section>;
}
