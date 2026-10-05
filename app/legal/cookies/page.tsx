export default function CookiesPage() {
  return (
    <section className="section" style={{ paddingTop: 150 }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 className="h1">Browser storage & analytics</h1>
        <p className="intro">The planner remembers travel preferences in this browser tab for up to 24 hours. Name, email, phone and free-text notes are not included in that saved draft.</p>
        <p>We also keep a random submission reference in the tab to avoid duplicate enquiries when you retry. Closing the tab clears this session storage.</p>
        <p>When website measurement is enabled, we record page paths and enquiry steps using a temporary session identifier. These events exclude form contents, URL query strings and IP addresses. Measurement respects your browser’s Do Not Track setting.</p>
      </div>
    </section>
  );
}
