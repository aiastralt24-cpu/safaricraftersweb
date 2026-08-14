import Link from "next/link";
import "../../simple.css";
import "../admin.css";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="admin-login-page">
      <section className="admin-login-panel">
        <Link className="admin-back-link" href="/">Safari Crafters</Link>
        <h1>Admin access</h1>
        <p>Enter the private admin token to view guest enquiries.</p>
        <form action="/api/admin/login" method="post">
          <label>Admin token<input name="token" type="password" autoComplete="current-password" required autoFocus /></label>
          {error ? <p className="admin-login-error" role="alert">{error === "unconfigured" ? "ADMIN_TOKEN is not configured." : "That token was not recognised."}</p> : null}
          <button className="button button-solid" type="submit">Open enquiry inbox</button>
        </form>
      </section>
    </div>
  );
}
