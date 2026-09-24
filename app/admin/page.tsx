import Link from "next/link";
import "../simple.css";
import "./admin.css";

export default function AdminPage() {
  return (
    <section className="section admin-page">
      <div className="container admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Production CMS</p>
            <h1 className="h1">Safari Crafters Studio.</h1>
            <p className="admin-summary">
              Use Sanity Studio for editing and draft review. Published changes reach the public site through a validated Vercel deployment; Studio changes alone do not update the live site.
            </p>
          </div>
          <Link className="button button-solid" href="/studio">
            Open Studio
          </Link>
        </div>
        <div className="admin-grid admin-deprecated-grid">
          <section className="admin-panel admin-enquiry-panel">
            <h2>Guest enquiries</h2>
            <p>Review private journey briefs, contact details and assigned specialists.</p>
            <Link className="button" href="/admin/enquiries">Open enquiry inbox</Link>
          </section>
          <section className="admin-panel">
            <h2>What moved to Sanity</h2>
            <p>Homepage, journeys, destinations, photo expeditions, journal, specialists, testimonials and hero media.</p>
          </section>
          <section className="admin-panel">
            <h2>Launch checks</h2><Link href="/admin/operations">Check configuration, delivery queue and funnel</Link>
            <h2>Publishing setup</h2>
            <p>Set `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, set SAFARI_CONTENT_SOURCE=sanity in Vercel, and redeploy after publishing. Review the deployment guide before the first CMS import.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
