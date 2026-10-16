"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Image from "next/image";
import partners from "@/content/preferred-partners.json";
import styles from "./PreferredPartners.module.css";

export function PreferredPartners() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const group = partners[active];
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  return <section ref={section} className={styles.section} aria-labelledby="preferred-partners-title" data-nav-label="Preferred partners">
    <div className={styles.inner}>
      <header className={styles.heading}><p className="eyebrow">Exceptional places. Trusted connections.</p><h2 id="preferred-partners-title">Preferred <em>partners.</em></h2></header>
      <div className={styles.filters} role="group" aria-label="Partner regions">
        {partners.map((item, index) => <button type="button" key={item.region} aria-pressed={active === index} aria-controls="partner-logos" onClick={() => setActive(index)}>{item.region}</button>)}
      </div>
      <div className={styles.flow} id="partner-logos" aria-label={`${group.region} partners`}>
        <div key={group.region} className={styles.track} data-paused={paused || !visible} style={{ "--logo-count": group.partners.length, "--flow-duration": `${group.partners.length * 7}s` } as CSSProperties}>
          {[false, true].map(duplicate => <ul className={styles.logos} key={String(duplicate)} aria-hidden={duplicate || undefined}>
            {group.partners.map(partner => <li key={partner.src}><Image src={partner.src} alt={duplicate ? "" : partner.name} width={240} height={140} sizes="(max-width:600px) 150px, 190px" /></li>)}
          </ul>)}
        </div>
      </div>
      <button type="button" className={styles.pause} onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Resume partner animation" : "Pause partner animation"}><span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{paused ? "Resume motion" : "Pause motion"}</button>
    </div>
  </section>;
}
