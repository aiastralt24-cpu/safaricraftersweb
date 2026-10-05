"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section" style={{ minHeight: "70vh", paddingTop: 150, textAlign: "center" }}>
      <div className="container">
        <p className="eyebrow">500</p>
        <h1 className="h1">This page couldn’t load.</h1>
        <p className="intro">Please try again. If the problem continues, contact hello@safaricrafters.com.</p>
        <button className="button button-solid" onClick={reset} type="button">Try again</button>{" "}
        <Link className="button" href="/">
          Return Home
        </Link>
      </div>
    </section>
  );
}
