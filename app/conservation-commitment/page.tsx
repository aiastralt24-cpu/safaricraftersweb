import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { destinations } from "@/lib/data";
import "../simple.css";

const heroImage = destinations.find((item) => item.slug === "bandhavgarh")?.image ?? destinations[0].image;

export const metadata: Metadata = {
  title: "Conservation Commitment",
  description:
    "Safari Crafters' conservation commitment through Astral Foundation: practical wildlife support without donation-led guest appeals."
};

export default function ConservationCommitmentPage() {
  return (
    <>
      <PageHero
        title="Conservation, quietly."
        meta="Through Astral Foundation"
        copy="No guest donations. Just field support, habitat care and long-view responsibility."
        image={heroImage}
      />
      <section className="section simple">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Giving back to nature</p>
            <h2 className="h2">A responsibility carried beyond the journey.</h2>
          </div>
          <div>
            <p>
              Safari Crafters’ conservation work is shaped through Astral Foundation,
              with a focus on practical support rather than public fundraising. The
              intention is simple: strengthen the landscapes we travel through and
              honour the people who protect them every day.
            </p>
            <p>
              The work spans field infrastructure, freshwater support, solar and
              battery initiatives, electric mobility, camera-trap documentation,
              habitat and grassland care, community development, skill training and
              research-led support for species such as leopards and Eurasian otters.
            </p>
          </div>
        </div>
      </section>
      <section className="section simple">
        <div className="container founder-profiles">
          <article>
            <p className="eyebrow">Field support</p>
            <h3>Helping forest teams work with better tools, access and resilience.</h3>
            <p>
              Conservation often depends on unglamorous details: vehicles, water,
              power, monitoring equipment and support systems that allow protection
              work to continue in difficult terrain and changing seasons.
            </p>
          </article>
          <article>
            <p className="eyebrow">Community development</p>
            <h3>Backing the human landscapes around protected wilderness.</h3>
            <p>
              Long-term wildlife protection is inseparable from local communities.
              Skill training, development initiatives and thoughtful support around
              wilderness regions help conservation become a shared future, not an
              isolated idea.
            </p>
          </article>
          <article>
            <p className="eyebrow">Research and habitat</p>
            <h3>Supporting the patient work behind responsible wildlife knowledge.</h3>
            <p>
              Camera trapping, species studies and habitat care help deepen the
              understanding of wild populations and the places they depend on.
              This is the quiet science behind better field decisions.
            </p>
          </article>
          <Link className="text-link" href="/plan">
            Plan a conservation-aware journey <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="section simple conservation-proof">
        <div className="container simple-grid">
          <div>
            <p className="eyebrow">Astral Foundation in the field</p>
            <h2 className="h2">Practical conservation, already put to work.</h2>
          </div>
          <div>
            <p>
              Through Astral Foundation, support has moved into the everyday needs
              of wild landscapes: the quiet infrastructure, research, training and
              community work that rarely appears in a safari photograph, but often
              decides how well a landscape is protected.
            </p>
          </div>
        </div>
        <div className="container conservation-proof-grid">
          <article>
            <p className="eyebrow">Ranthambhore region</p>
            <h3>Community, skills and field infrastructure.</h3>
            <p>
              Work referenced in the foundation material includes skill training,
              community development, Vikas Kendra support, field vehicles,
              freshwater initiatives, battery support for chowkis and solar-backed
              infrastructure.
            </p>
          </article>
          <article>
            <p className="eyebrow">Wildlife research</p>
            <h3>Camera traps, leopards and Eurasian otters.</h3>
            <p>
              The conservation record includes camera-trap documentation, a study
              on leopard population, Eurasian otter field imagery and the release
              of a tagged Eurasian otter back into the wild.
            </p>
          </article>
          <article>
            <p className="eyebrow">Cleaner field movement</p>
            <h3>Electric mobility and lower-impact support.</h3>
            <p>
              Electric vehicle support appears as part of the foundation's field
              work, helping conservation teams move through sensitive landscapes
              with a quieter, more responsible footprint.
            </p>
          </article>
          <article>
            <p className="eyebrow">Habitat care</p>
            <h3>Grasslands, Panna and Kanha landscapes.</h3>
            <p>
              The material also references grassland work and landscape support
              connected to Panna and Kanha, including areas such as Pathan Jhiriya,
              Kariwa, Jamun Tola and Madhhwa Dadar.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
