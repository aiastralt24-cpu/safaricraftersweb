"use client";

import Link from "next/link";

export default function ErrorPage() {
  return (
    <section className="section" style={{ minHeight: "70vh", paddingTop: 150, textAlign: "center" }}>
      <div className="container">
        <p className="eyebrow">500</p>
        <h1 className="h1">Something interrupted the field note.</h1>
        <p className="intro">Please return home or try again in a moment.</p>
        <Link className="button button-solid" href="/">
          Return Home
        </Link>
      </div>
    </section>
  );
}
