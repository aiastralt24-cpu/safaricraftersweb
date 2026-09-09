import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { productSchema } from "@/lib/structured-data";
import StoreMotion from "./StoreMotion";
import StoreGallery from "./StoreGallery";
import InternationalOrder from "./InternationalOrder";
import "./store.css";

const storeProductHref =
  "https://www.store.safaricrafters.com/products/the-ghosts-of-the-granite-hills";

const fieldNotes = [
  {
    src: "/assets/store/ghosts-book-leopard-family.webp",
    alt: "Open Ghosts of the Granite Hills book showing a leopard family across a photographic spread",
    title: "Kinship",
    copy: "A mother and her young hold the granite as both refuge and inheritance."
  },
  {
    src: "/assets/store/ghosts-book-leopard-in-grass.webp",
    alt: "Open Ghosts of the Granite Hills book showing a leopard moving through green grass",
    title: "Passage",
    copy: "Between thorn forest and village fields, the leopard moves without announcing itself."
  },
  {
    src: "/assets/store/ghosts-book-open-spread.webp",
    alt: "Open Ghosts of the Granite Hills book displaying a full-page leopard portrait",
    title: "Presence",
    copy: "Not a visitor to this country, but an ancient and watchful resident."
  }
];

export const metadata: Metadata = {
  title: "Ghosts of the Granite Hills | Safari Crafters Store",
  description:
    "A decade in the making, Ghosts of the Granite Hills is Kairav Engineer's 396-page natural history of Jawai, its leopards and their shared habitat.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Ghosts of the Granite Hills",
    description: "A decade of fieldwork devoted to the leopards, habitat and inhabitants of Jawai.",
    images: ["/assets/store/ghosts-book-cover.webp"]
  }
};

function AcquireEdition({
  className = "",
  label = "Purchase the book"
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link className={`store-acquire ${className}`.trim()} href={storeProductHref}>
      <span>{label}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  );
}

export default function StorePage() {
  return (
    <>
      <JsonLd data={productSchema()} />
      <StoreMotion />

      <section className="store-hero" aria-labelledby="store-title">
        <div className="container store-hero-grid">
          <div className="store-hero-copy">
            <p className="store-kicker">Jawai · Rajasthan</p>
            <h1 id="store-title">
              A wild landscape,{" "}
              <span>held in print.</span>
            </h1>
            <p className="store-byline">
              Ghosts of the Granite Hills,
              <br />
              A photographic work by
              <br />
              Kairav{"\u00A0"}Engineer
            </p>
            <p className="store-hero-intro">
              A decade of fieldwork distilled into 396 pages of natural{"\u00A0"}history, tracing the
              leopards of Jawai, their granite habitat and the lives unfolding around them.
            </p>
            <div className="store-hero-action">
              <div className="store-purchase-actions">
                <AcquireEdition label="Purchase the book" />
                <InternationalOrder />
              </div>
              <a className="store-preview-link" href="#book-preview">View inside the book</a>
            </div>
            <div className="store-hero-facts" aria-label="Book price and edition">
              <p><span>Price</span><strong>₹3,300</strong></p>
              <p><span>Edition</span><strong>Limited to 2,000 copies</strong></p>
            </div>
          </div>

          <figure className="store-hero-media">
            <div className="store-image-frame">
              <Image
                src="/assets/store/ghosts-book-cover.webp"
                alt="Red clothbound Ghosts of the Granite Hills collector's book displayed in an interior"
                width={1800}
                height={2400}
                priority
                sizes="(max-width: 920px) 100vw, 46vw"
              />
            </div>
            <figcaption>A decade in the making</figcaption>
          </figure>
        </div>
      </section>

      <section className="store-purchase-notes" aria-label="Edition and purchase information">
        <div className="container">
          <dl>
            <div><dt>Edition</dt><dd>Signed and individually numbered</dd></div>
            <div><dt>Format</dt><dd>396-page clothbound hardcover</dd></div>
            <div><dt>Delivery</dt><dd>Options and charges confirmed at checkout</dd></div>
            <div><dt>Assistance</dt><dd><Link href="/contact">Ask about delivery</Link></dd></div>
          </dl>
          <p>The acquisition link continues to the official Safari Crafters store to complete the order securely.</p>
        </div>
      </section>

      <section className="store-introduction" aria-labelledby="jawai-title">
        <div className="container store-introduction-grid">
          <figure className="store-introduction-media" data-reveal="image" data-store-expand>
            <Image
              src="/assets/destinations/jawai/jawai-01.jpg"
              alt="Two leopards silhouetted on Jawai's granite hills beneath a full moon"
              fill
              loading="lazy"
              sizes="(max-width: 920px) 100vw, 52vw"
            />
            <figcaption>Jawai · The granite hills after dusk</figcaption>
          </figure>
          <div className="store-introduction-copy">
            <p className="store-kicker" data-reveal="rise">Jawai, Western India</p>
            <h2 id="jawai-title" data-reveal="words">
              <span>Where the stone</span>
              <span>remembers.</span>
            </h2>
            <div className="store-prose store-introduction-prose" data-reveal="rise">
              <p>
                Jawai rises in ancient shoulders of granite, burnished by heat, wind and time.
                Rabari herders move beneath these hills as their families have for generations;
                above them, leopards wait in sun-split caves for evening.
              </p>
              <p>
                Over ten years, Kairav Engineer followed the whole living system, studying not
                only its leopards, but its terrain, seasons, prey and pastoral communities. The
                book is a portrait of coexistence shaped slowly, and observed with patience.
              </p>
            </div>
          </div>
          <figure className="store-author-note" data-reveal="rise">
            <figcaption>A note from the author</figcaption>
            <blockquote>
              <p>
                “Jawai is a rare equilibrium where granite hills, wildlife and human presence
                coexist. The leopards here symbolise balance; they are quiet, assured and deeply
                rooted in their terrain. Jawai, to me, mirrors the deeper character of India, with
                its inimitable resilience and restraint. This book is a record of that harmony. It
                is a visual and emotional documentation of a place where the human is part of the
                more-than-human world, without insisting on dominance. Through these pages, I
                share Jawai as it truly is to me: an unforced and timeless tale of nature.”
              </p>
              <footer>
                <cite>Kairav Engineer</cite>
                <span>Author and Founder of Safari Crafters</span>
              </footer>
            </blockquote>
          </figure>
        </div>
      </section>

      <section className="store-field" id="book-preview" aria-labelledby="field-title">
        <div className="container store-field-heading">
          <p className="store-section-label store-section-label-light" data-reveal="rise">The lives within</p>
          <div>
            <p className="store-kicker" data-reveal="rise">Ten years in the field</p>
            <h2 id="field-title" data-reveal="words">A landscape observed in full.</h2>
          </div>
        </div>

        <StoreGallery images={fieldNotes} />
      </section>

      <section className="store-making" aria-labelledby="making-title">
        <div className="container store-making-grid">
          <figure data-reveal="image">
            <div className="store-making-image" data-store-expand>
              <Image
                src="/assets/store/ghosts-book-interior-lounge.webp"
                alt="Open Ghosts of the Granite Hills book displayed on a marble table in a quiet lounge"
                width={1800}
                height={2400}
                loading="lazy"
                sizes="(max-width: 920px) 100vw, 52vw"
              />
            </div>
          </figure>
          <div className="store-making-copy">
            <p className="store-section-label" data-reveal="rise">The book</p>
            <p className="store-kicker" data-reveal="rise">Research, observation, natural history</p>
            <h2 id="making-title" data-reveal="words">396 pages of a living world.</h2>
            <div className="store-prose" data-reveal="rise">
              <p>
                Across a decade, Kairav Engineer followed Jawai through seasons of dust, monsoon
                green and long amber evenings. Patient field observation reveals the leopard in
                context: among granite caves, prey, people and the rhythms that sustain them all.
              </p>
              <p>
                Bound in deep red cloth, the volume carries a foreword by wildlife filmmakers
                Jonathan and Angela Scott. It is both a photographic monograph and a deeply
                researched record of one of India’s most remarkable shared landscapes.
              </p>
            </div>
            <dl className="store-edition-details" data-reveal="rise">
              <div><dt>Author</dt><dd>Kairav Engineer</dd></div>
              <div><dt>Format</dt><dd>396-page clothbound hardcover</dd></div>
              <div><dt>Edition</dt><dd>Limited edition of 2,000</dd></div>
              <div><dt>Foreword</dt><dd>Jonathan &amp; Angela Scott</dd></div>
            </dl>
            <AcquireEdition className="store-making-cta" label="Acquire a signed copy" />
          </div>
        </div>
      </section>

      <section className="store-final" aria-labelledby="final-title">
        <div className="container store-final-inner" data-reveal="rise">
          <p className="store-kicker">Ghosts of the Granite Hills</p>
          <h2 id="final-title">A decade in the field, bound in one volume.</h2>
          <p className="store-final-note">396 pages · Clothbound hardcover · ₹3,300</p>
          <AcquireEdition label="Order your edition" />
        </div>
      </section>
    </>
  );
}
