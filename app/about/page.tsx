import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { specialists } from "@/lib/data";
import "../simple.css";

export const metadata: Metadata = {
  title: "About",
  description: "The founder story, field specialists, photography philosophy and conservation values behind Safari Crafters."
};

export default function AboutPage() {
  const kairav = specialists.find((specialist) => specialist.name.includes("Kairav")) ?? specialists[0];
  const gaurav = specialists.find((specialist) => specialist.name.includes("Gaurav")) ?? specialists[1];

  return (
    <>
      <PageHero
        title="Founded in the field."
        copy="Safari Crafters is led by people who have spent years reading forests, waiting in leopard hills, working with conservation landscapes and shaping journeys where patience is treated as a luxury."
        image={specialists[0].image}
        meta="About"
      />
      <section className="section simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="h2">The route begins with people who know what the land asks of you.</h2>
          </div>
          <div>
            <p>
              Safari Crafters curates immersive, intimate and exclusive safari experiences
              across the world's celebrated wild frontiers, from India's tiger forests and
              leopard hills to the Pantanal, Kenya, Svalbard and high Himalayan snow leopard
              country.
            </p>
            <p>
              The work is intentionally personal: trusted naturalists, refined wilderness
              stays, careful routing, and enough field time for a place to reveal itself
              honestly. Every journey is shaped with the restraint of people who understand
              that the wild does not perform on command.
            </p>
            <Link className="button button-solid" href="/specialists">
              Meet the Specialists
            </Link>
          </div>
        </div>
      </section>
      <section className="section band-ivory simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Founder and field leadership</p>
            <h2 className="h2">Kairav Engineer and Gaurav Ramnarayanan give the brand its field authority.</h2>
          </div>
          <div className="founder-profiles founder-portraits">
            <article>
              <div className="founder-portrait image-frame">
                <img src={kairav.image.src} alt={kairav.image.alt || "Kairav Engineer"} />
              </div>
              <div>
                <p className="eyebrow">Kairav Engineer</p>
                <h3>Founder</h3>
                <p>
                  Kairav Engineer founded Safari Crafters from a lifelong relationship with
                  wilderness, photography and conservation. His perspective is not built from
                  boardroom travel language; it comes from time in forests, from watching how
                  landscapes change with pressure, and from understanding that luxury travel
                  can protect a place only when it is designed with sensitivity.
                </p>
                <p>
                  His conservation work through the Astral Foundation, including support for
                  habitats around Ranthambore, Jawai and other wildlife landscapes, gives Safari
                  Crafters a deeper responsibility than arranging beautiful safaris. The aim is
                  to create journeys that feel rare for the guest and respectful for the land,
                  the guides and the communities who keep these places alive.
                </p>
              </div>
            </article>
            <article>
              <div className="founder-portrait image-frame">
                <img src={gaurav.image.src} alt={gaurav.image.alt || "Gaurav Ramnarayanan"} />
              </div>
              <div>
                <p className="eyebrow">Gaurav Ramnarayanan</p>
                <h3>Chief Operating Officer</h3>
                <p>
                  Gaurav Ramnarayanan brings the discipline of a wildlife photographer and the
                  precision of an operator to Safari Crafters. He understands the quiet mechanics
                  behind a great sighting: the right gate, the right guide, the right season, and
                  the grace to wait when the forest asks for silence.
                </p>
                <p>
                  His role is central to the photography-led journeys and private field
                  experiences, where guests need more than access. They need rhythm, mentorship,
                  safety, sharp logistics and someone who knows when a moment should be pursued,
                  and when it should simply be witnessed.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="section simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Photography philosophy</p>
            <h2 className="h2">The camera never outranks the animal.</h2>
          </div>
          <div>
            <p>
              Our photo-led work is built around distance, behaviour and patience. We choose
              reserves, guides and vehicles that allow better images without forcing the field
              to perform.
            </p>
          </div>
        </div>
      </section>
      <section className="section band-ivory simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Conservation</p>
            <h2 className="h2">Travel must give the landscape a reason to remain whole.</h2>
          </div>
          <div>
            <p>
              Safari Crafters prioritises responsible operators, private conservancies,
              thoughtful park access and partnerships that support habitat, guides and local
              communities.
            </p>
            <Link className="brass-link" href="/contact">
              Speak with us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
