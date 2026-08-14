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
              The JSON editor has been retired as the primary backend. Use Sanity
              Studio for production editing, media, draft review and structured
              content updates.
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
            <h2>Setup</h2>
            <p>Set `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, then run `npm run sanity:seed` with `SANITY_WRITE_TOKEN`.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
