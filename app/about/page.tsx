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
  return (
    <>
      <PageHero
        title="Founded in the field."
        copy="Founded in 2018, Safari Crafters curates immersive wildlife and photography journeys guided by professionals who understand wildlife and refined hospitality."
        image={specialists[0].image}
        meta="About"
      />
      <section className="section simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="h2">Immersive wildlife and photography journeys, crafted with intent.</h2>
          </div>
          <div>
            <p>
              Safari Crafters was founded in 2018 and shaped by a passion for wildlife. The
              company curates immersive wildlife and photography journeys that place travellers
              close to nature in its unfiltered form.
            </p>
            <p>
              Each itinerary is designed around the traveller's expectations, preferred
              accommodation and the natural rhythm of the wilderness, while leaving room for
              unscripted moments shaped by light, silence, patience and presence.
            </p>
            <Link className="button button-solid" href="/specialists">
              Meet the Specialists
            </Link>
          </div>
        </div>
      </section>
      <section className="section band-ivory simple">
        <div className="container founder-leadership">
          <div className="founder-leadership-heading">
            <p className="eyebrow">Founder and field leadership</p>
            <h2 className="h2">The people behind Safari Crafters.</h2>
          </div>
          <div className="founder-profiles founder-portraits">
            <article>
              <div className="founder-portrait image-frame">
                <img src="/assets/founders/kairav-engineer.jpg" alt="Kairav Engineer in Safari Crafters field gear" />
              </div>
              <div>
                <p className="eyebrow">Kairav Engineer</p>
                <h3>Founder</h3>
                <p>
                  Kairav Engineer is an Executive Director at Astral Limited, an author, and a
                  wildlife photographer. His long-term work in landscapes such as Ranthambore
                  and Jawai is shaped by years of observation and an evolving understanding of
                  animal behaviour.
                </p>
                <p>
                  His conservation work includes habitat strengthening, water restoration,
                  anti-poaching preparedness and improved infrastructure for forest guards in
                  landscapes including Ranthambore, Bandhavgarh, Pench, Satpura, Kanha and
                  Kaziranga.
                </p>
              </div>
            </article>
            <article>
              <div className="founder-portrait image-frame">
                <img src="/assets/founders/gaurav-ramnarayanan.jpg" alt="Gaurav Ramnarayanan in the field at sunset" />
              </div>
              <div>
                <p className="eyebrow">Gaurav Ramnarayanan</p>
                <h3>Chief Operating Officer</h3>
                <p>
                  Introduced to photography at age three through a camera gifted by his father,
                  Gaurav Ramnarayanan spent much of his childhood near a tiger reserve in South
                  India. He has travelled extensively across India and around the world,
                  documenting wildlife, cultures and environments.
                </p>
                <p>
                  As Chief Operating Officer, he translates this experience into carefully
                  curated journeys that balance operational excellence with authenticity. He is
                  the recipient of five international photography awards from institutions in
                  the United Kingdom and the United States.
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
