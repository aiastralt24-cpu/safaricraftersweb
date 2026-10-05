import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { AboutMotion } from "./AboutMotion";
import "../simple.css";

const aboutHeroImage = {
  src: "/assets/destinations/ranthambhore/ranthambhore-03.jpg",
  alt: "A tiger walking beside a forest lake at sunrise",
  credit: "Safari Crafters archive"
};

export const metadata: Metadata = {
  title: "About",
  description: "The founder story, field specialists, photography philosophy and conservation values behind Safari Crafters."
};

export default function AboutPage() {
  return (
    <>
      <AboutMotion />
      <PageHero
        title="Founded in the field."
        copy="Founded in 2018, Safari Crafters curates immersive wildlife and photography journeys guided by professionals who understand wildlife and refined hospitality."
        image={aboutHeroImage}
        focalPoint="center 58%"
        meta="About"
      />
      <section className="section simple">
        <div className="container simple-grid" data-about-reveal>
          <div data-about-reveal-item>
            <p className="eyebrow">Our story</p>
            <h2 className="h2">Immersive wildlife and photography journeys, crafted with intent.</h2>
          </div>
          <div data-about-reveal-item>
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
            <Link className="button button-solid" href="/contact">
              Plan a journey
            </Link>
          </div>
        </div>
      </section>
      <section className="section band-ivory simple">
        <div className="container founder-leadership">
          <div className="founder-leadership-heading" data-about-reveal>
            <div data-about-reveal-item>
              <p className="eyebrow">Founder and field leadership</p>
              <h2 className="h2">The wild shaped each of us differently.</h2>
            </div>
            <p className="about-leadership-intro" data-about-reveal-item>
              Together, we bring field knowledge, thoughtful operations and visual storytelling
              to every journey we create.
            </p>
          </div>
          <div className="founder-profiles founder-portraits">
            <article data-about-profile>
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
            <article data-about-profile>
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
            <article data-about-profile>
              <div className="founder-portrait founder-portrait-trikansh image-frame">
                <img
                  src="/assets/founders/trikansh-sharma.jpg"
                  alt="Trikansh Sharma photographing in the mountains of Ladakh"
                />
              </div>
              <div>
                <p className="eyebrow">Trikansh Sharma</p>
                <h3>Chief Marketing Officer</h3>
                <p>
                  Trikansh is a nature, wildlife and travel photographer whose relationship with
                  the camera began through his father. Over more than a decade, he has led
                  hundreds of expeditions, photography tours and workshops across India and
                  abroad, helping thousands of enthusiasts develop their own way of seeing the
                  natural world.
                </p>
                <p>
                  His work has received a National Geographic Award, and his association with
                  Nikon India has contributed to wider conversations around photography and
                  imaging technology. At Safari Crafters, he brings field experience, visual
                  storytelling and a close understanding of travellers to the creation of
                  distinctive, deeply personal journeys.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="section about-principles" aria-labelledby="about-principles-title">
        <div className="container about-principles-grid">
          <div className="about-principles-heading" data-about-reveal>
            <p className="eyebrow">What guides us</p>
            <h2 className="h2" id="about-principles-title">The field sets the terms.</h2>
            <p>
              Better journeys begin with restraint: knowing when to move closer, when to wait
              and when to leave a place exactly as it was found.
            </p>
          </div>
          <div className="about-principles-list">
            <article data-about-reveal>
              <span aria-hidden="true">01</span>
              <div>
                <p className="eyebrow">Photography philosophy</p>
                <h3>The camera never outranks the animal.</h3>
                <p>
                  Our photo-led work is built around distance, behaviour and patience. We choose
                  reserves, guides and vehicles that allow better images without forcing the
                  field to perform.
                </p>
              </div>
            </article>
            <article data-about-reveal>
              <span aria-hidden="true">02</span>
              <div>
                <p className="eyebrow">Conservation</p>
                <h3>Travel must help the landscape remain whole.</h3>
                <p>
                  We prioritise responsible operators, private conservancies, thoughtful park
                  access and partnerships that support habitat, guides and local communities.
                </p>
                <Link className="brass-link" href="/conservation-commitment">
                  Our conservation commitment
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
