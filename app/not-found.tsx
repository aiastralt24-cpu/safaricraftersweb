import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: "70vh", paddingTop: 150, textAlign: "center" }}>
      <div className="container">
        <p className="eyebrow">404</p>
        <h1 className="h1">This track has gone quiet.</h1>
        <p className="intro">Return to the main trail and begin again.</p>
        <Link className="button button-solid" href="/">
          Return Home
        </Link>
      </div>
    </section>
  );
}
