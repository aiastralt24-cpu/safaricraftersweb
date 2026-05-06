import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { journeys } from "@/lib/data";
import "../simple.css";

const heroImage = journeys[0].image;

export const metadata: Metadata = {
  title: "Private Aviation",
  description:
    "Safari Crafters private aviation circuits through Kairamya Air, connecting luxury safari landscapes with company-owned aircraft."
};

export default function PrivateAviationPage() {
  return (
    <>
      <PageHero
        title="Private Aviation"
        meta="Luxury circuits and safari journeys"
        copy="For guests who want the wilderness to feel seamless, Safari Crafters can shape private air safari circuits through Kairamya Air’s company-owned fleet."
        image={heroImage}
      />
      <section className="section simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Company-owned private jets</p>
            <h2 className="h2">India’s rare safari advantage: distance made quiet.</h2>
          </div>
          <div>
            <p>
              India’s finest wilderness regions are powerful precisely because they
              are far apart: tiger forests, leopard country, high-altitude valleys,
              desert edges, royal cities and remote conservation landscapes. Private
              aviation allows these places to connect with unusual ease.
            </p>
            <p>
              Through Kairamya Air, Safari Crafters can design refined safari
              circuits where aircraft, ground teams, lodges, permits and field
              timing are planned as one continuous experience.
            </p>
          </div>
        </div>
      </section>
      <section className="section simple">
        <div className="container founder-profiles">
          <article>
            <p className="eyebrow">Gulfstream G150</p>
            <h3>Longer private routing with a spacious cabin for 7-8 guests.</h3>
            <p>
              Suited to longer safari circuits and multi-region journeys, the
              Gulfstream G150 brings range, comfort and discretion to complex India
              itineraries where time matters.
            </p>
          </article>
          <article>
            <p className="eyebrow">Cessna Citation CJ2</p>
            <h3>Elegant regional access for up to 6 guests.</h3>
            <p>
              Compact, efficient and refined, the Citation CJ2 is well suited to
              short-haul safari routing, private regional movements and carefully
              paced wilderness extensions.
            </p>
          </article>
          <Link className="text-link" href="/plan?experience=private-aviation">
            Plan a private air safari <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
