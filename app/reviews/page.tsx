import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { heroImage, testimonials } from "@/lib/data";
import "./reviews.css";

export const metadata: Metadata = {
  title: "Guest Notes",
  description: "Verified guest notes from private Safari Crafters journeys, family safaris and specialist-led wildlife travel.",
  alternates: { canonical: "/reviews" }
};

export default function ReviewsPage() {
  return (
    <>
      <PageHero
        title="Journeys remembered quietly."
        copy="Notes from travellers who asked for the wild to be handled with care, patience and precision."
        image={heroImage}
        meta="Guest Notes"
      />
      <section className="section guest-notes-page">
        <div className="container guest-notes-intro">
          <p className="eyebrow">Reviews</p>
          <h2 className="h2">Proof should feel human, not loud.</h2>
          <p>
            Each note is framed by the kind of journey requested, the place travelled and
            the quiet detail guests remembered afterwards.
          </p>
        </div>
        <div className="container guest-notes-grid">
          {testimonials.map((testimonial) => (
            <article className="guest-note-card" key={`${testimonial.name}-${testimonial.trip}`}>
              <p>{testimonial.guestType ?? testimonial.name}</p>
              <blockquote>“{testimonial.quote}”</blockquote>
              <dl>
                <div>
                  <dt>Journey</dt>
                  <dd>{testimonial.trip}</dd>
                </div>
                <div>
                  <dt>Guest base</dt>
                  <dd>{testimonial.city}</dd>
                </div>
                <div>
                  <dt>Travelled</dt>
                  <dd>{testimonial.travelled ?? "Private journey"}</dd>
                </div>
                {testimonial.arranged ? (
                  <div>
                    <dt>Arranged</dt>
                    <dd>{testimonial.arranged}</dd>
                  </div>
                ) : null}
              </dl>
              {testimonial.journeySlug || testimonial.destinationSlug ? (
                <Link className="guest-note-link" href={testimonial.journeySlug ? `/journeys/${testimonial.journeySlug}` : `/destinations/${testimonial.destinationSlug}`}>
                  Explore the journey
                </Link>
              ) : null}
            </article>
          ))}
        </div>
        <div className="container guest-notes-cta">
          <h2 className="h2">Begin a journey worth remembering well.</h2>
          <Link className="button button-solid" href="/plan">
            Begin a Private Brief
          </Link>
        </div>
      </section>
    </>
  );
}
