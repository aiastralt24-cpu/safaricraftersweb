import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Inbox, LogOut, RefreshCw, Search } from "lucide-react";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { enquiryStatus, getEnquiries, payloadText, type EnquiryRecord } from "@/lib/enquiries";
import "../../simple.css";
import "../admin.css";

type Params = { q?: string; status?: string; selected?: string };

function formatReceived(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function Detail({ enquiry }: { enquiry: EnquiryRecord }) {
  const p = enquiry.payload;
  const email = payloadText(p, "email", "");
  const nights = payloadText(p, "nights", "");
  return (
    <aside className="enquiry-detail" aria-label={`Enquiry ${enquiry.enquiry_id}`}>
      <div className="enquiry-detail-heading">
        <div><p className="admin-label">Enquiry reference</p><h2>{enquiry.enquiry_id}</h2><p>Received {formatReceived(enquiry.created_at)}</p></div>
        <span className={`enquiry-status status-${enquiryStatus(enquiry)}`}>{enquiryStatus(enquiry)}</span>
      </div>
      <section className="enquiry-detail-section">
        <p className="admin-label">Guest & contact</p>
        <h3>{payloadText(p, "name")}</h3>
        {email ? <a href={`mailto:${email}`}>{email}</a> : <p>Email not provided</p>}
        <p>{payloadText(p, "phone")}</p><p>{payloadText(p, "city")}</p>
      </section>
      <div className="enquiry-facts">
        <div><span>Journey / region</span><strong>{payloadText(p, "sourceLabel", payloadText(p, "region"))}</strong></div>
        <div><span>Assigned specialist</span><strong>{enquiry.specialist}</strong></div>
        <div><span>Travel timing</span><strong>{payloadText(p, "months")} {payloadText(p, "year", "")}</strong></div>
        <div><span>Travellers</span><strong>{payloadText(p, "travellers")}</strong></div>
        <div><span>Journey style</span><strong>{payloadText(p, "types")}</strong></div>
        <div><span>Interests</span><strong>{payloadText(p, "experiences")}</strong></div>
        <div><span>Length</span><strong>{nights ? `${nights} nights` : "Not provided"}</strong></div>
        <div><span>Preferred contact</span><strong>{payloadText(p, "contactPreference")}</strong></div>
      </div>
      <section className="enquiry-notes"><p className="admin-label">Guest notes</p><p>{payloadText(p, "notes", "No additional notes were supplied.")}</p></section>
      {email ? <a className="button button-solid enquiry-reply" href={`mailto:${email}?subject=${encodeURIComponent(`${enquiry.enquiry_id} · Safari Crafters`)}`}>Reply to guest</a> : null}
    </aside>
  );
}

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSession(session)) redirect("/admin/login");
  const params = await searchParams;
  let enquiries: EnquiryRecord[] = [];
  let loadError = "";
  try { enquiries = await getEnquiries({ query: params.q, status: params.status }); }
  catch (error) { loadError = error instanceof Error ? error.message : "Enquiries could not be loaded."; }

  const selected = enquiries.find((item) => item.enquiry_id === params.selected) || enquiries[0];
  const counts = enquiries.reduce((result, item) => {
    const status = enquiryStatus(item);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {} as Record<string, number>);

  return (
    <div className="enquiries-page">
      <header className="enquiries-admin-header">
        <Link href="/admin" className="admin-wordmark">Safari Crafters</Link>
        <nav><Link href="/studio">Content Studio</Link><strong>Enquiries</strong><form action="/api/admin/logout" method="post"><button type="submit"><LogOut size={16} /> Sign out</button></form></nav>
      </header>
      <div className="enquiries-shell">
        <section className="enquiries-overview">
          <div><h1>Enquiries</h1><p>Guest briefs submitted through Safari Crafters.</p></div>
          <dl><div><dt>Total shown</dt><dd>{enquiries.length}</dd></div><div><dt>New</dt><dd>{counts.new || 0}</dd></div><div><dt>Contacted</dt><dd>{counts.contacted || 0}</dd></div></dl>
        </section>
        <form className="enquiry-filters" method="get">
          <label><Search size={18} /><span className="sr-only">Search enquiries</span><input name="q" defaultValue={params.q} placeholder="Search guest, reference, email or region" /></label>
          <select name="status" defaultValue={params.status || "all"} aria-label="Filter by status"><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option></select>
          <button className="button" type="submit">Apply filters</button>
          <Link className="enquiry-refresh" href="/admin/enquiries"><RefreshCw size={17} /> Refresh</Link>
        </form>
        {loadError ? <section className="admin-state admin-error-state"><h2>Inbox unavailable</h2><p>{loadError}</p><p>Check the Supabase environment variables and database migration.</p></section> : null}
        {!loadError && !enquiries.length ? <section className="admin-state"><Inbox size={30} /><h2>No enquiries found</h2><p>New guest briefs will appear here after they are successfully stored.</p></section> : null}
        {enquiries.length ? <div className="enquiry-workspace">
          <section className="enquiry-list" aria-label="Enquiry list">
            <div className="enquiry-list-head"><span>Guest</span><span>Journey / region</span><span>Received</span></div>
            {enquiries.map((enquiry) => {
              const p = enquiry.payload;
              const href = new URLSearchParams();
              if (params.q) href.set("q", params.q);
              if (params.status) href.set("status", params.status);
              href.set("selected", enquiry.enquiry_id);
              return <Link className={selected?.enquiry_id === enquiry.enquiry_id ? "enquiry-row is-selected" : "enquiry-row"} href={`/admin/enquiries?${href}`} key={enquiry.enquiry_id}>
                <div><strong>{payloadText(p, "name")}</strong><small>{enquiry.enquiry_id} · {enquiry.specialist}</small></div>
                <div><span>{payloadText(p, "sourceLabel", payloadText(p, "region"))}</span><small className={`status-text status-${enquiryStatus(enquiry)}`}>{enquiryStatus(enquiry)}</small></div>
                <time dateTime={enquiry.created_at}>{formatReceived(enquiry.created_at)}</time>
              </Link>;
            })}
          </section>
          {selected ? <Detail enquiry={selected} /> : null}
        </div> : null}
      </div>
    </div>
  );
}
