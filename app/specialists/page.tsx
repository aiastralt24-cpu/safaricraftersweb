import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { specialists } from "@/lib/data";
import "../simple.css";

export const metadata: Metadata = {
  title: "Specialists",
  description: "Named Safari Crafters specialists for India safaris, Africa safaris and photography-led expeditions."
};

export default function SpecialistsPage() {
  return (
    <>
      <PageHero
        title="Named specialists, not anonymous enquiry desks."
        copy="Each journey is shaped by a person who understands the landscape, the season and the guest's reason for travelling."
        image={specialists[1].image}
        meta="Specialists"
      />
      <section className="section">
        <div className="container specialist-list">
          {specialists.map((specialist) => (
            <article key={specialist.name}>
              <div className="image-frame">
                <img src={specialist.image.src} alt={specialist.image.alt} loading="lazy" />
              </div>
              <div>
                <p className="eyebrow">{specialist.role}</p>
                <h2 className="h2">{specialist.name}</h2>
                <p className="intro">{specialist.expertise}</p>
                <p>{specialist.bio}</p>
                <Link className="button" href="/plan">
                  Plan with {specialist.name.split(" ")[0]}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
