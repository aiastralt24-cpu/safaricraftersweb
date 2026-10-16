import Image from "next/image";
import Link from "next/link";
import styles from "./MiceSection.module.css";
const formats = [
  { title: "Reward the remarkable", label: "Employee, dealer & distributor incentives", number: "01" },
  { title: "Make room for new ideas", label: "Company retreats & partner meets", number: "02" },
  { title: "Bring your people together", label: "Client hospitality & group journeys", number: "03" }
];
export function MiceSection() {
  return <section className={styles["mice-home"]} aria-labelledby="mice-home-title" data-nav-label="Corporate journeys">
    <div className={styles["mice-home-inner"]}>
      <div className={styles["mice-home-copy"]}><p className="eyebrow">Corporate journeys · MICE</p><h2 id="mice-home-title">Out of the office.<br />Into the <em className="editorial-accent editorial-accent-light">extraordinary.</em></h2><p>Incentive travel, partner retreats and client hospitality across India and international destinations. Bring employees, dealers, distributors and clients together through journeys shaped around your purpose.</p>
        <div className={styles["mice-home-formats"]}>{formats.map(format => <Link href="/mice" key={format.number}><div><small>{format.label}</small><h3>{format.title}</h3></div><span aria-hidden="true">↗</span></Link>)}</div>
        <Link className={styles["mice-home-cta"]} href="/mice">Discover corporate journeys <span aria-hidden="true">↗</span></Link>
      </div>
      <div className={styles["mice-home-composition"]}>
        <figure className={styles["mice-home-main-image"]}><Image src="/assets/destinations/kanha/field-photographs/8a6eba1b2e6a.webp" alt="A safari vehicle travelling through sunlit forest in Kanha, India" fill sizes="(max-width:760px) 90vw, 45vw" /><figcaption>India · Shared discoveries</figcaption></figure>
        <figure className={styles["mice-home-inset"]}><Image src="/assets/destinations/svalbard/field-photographs/eb87fa95c8f5.webp" alt="Mountains and an Arctic fjord in Svalbard" fill sizes="(max-width:760px) 42vw, 20vw" /><figcaption>International · Beyond borders</figcaption></figure>
      </div>
    </div>
  </section>;
}
