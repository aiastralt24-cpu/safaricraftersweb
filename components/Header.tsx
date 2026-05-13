"use client";

import Link from "next/link";
import { Menu, MoveRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { destinations, expeditions, journeys, specialists } from "@/lib/data";
import "./Header.css";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const tigerDestination = destinations.find((item) => item.slug === "bandhavgarh") ?? destinations[0];
const photoExpedition = expeditions[0];

const menuItems = [
  {
    key: "journeys",
    label: "Journeys",
    href: "/journeys",
    copy: "Private safaris signed by specialists, paced around wildlife rather than hotel nights.",
    image: heroJourney.image
  },
  {
    key: "destinations",
    label: "Destinations",
    href: "/destinations",
    copy: "A curated atlas of forests, wetlands, deserts and big-cat country.",
    image: featuredDestination.image
  },
  {
    key: "photo-expeditions",
    label: "Photo Expeditions",
    href: "/photo-expeditions",
    copy: "Field-led departures for photographers who want patience, access and mentorship.",
    image: photoExpedition.image
  },
  {
    key: "journal",
    label: "The Journal",
    href: "/journal",
    copy: "Field notes, conservation intelligence and photographic essays from the wild.",
    image: tigerDestination.image
  },
  {
    key: "conservation-commitment",
    label: "Conservation Commitment",
    href: "/conservation-commitment",
    copy: "How Safari Crafters gives back through Astral Foundation without asking guests for donations.",
    image: tigerDestination.image
  },
  {
    key: "private-aviation",
    label: "Private Aviation",
    href: "/private-aviation",
    copy: "Company-owned private jets shaping rare, seamless safari circuits across India.",
    image: heroJourney.image
  },
  {
    key: "about",
    label: "About",
    href: "/about",
    copy: "Founder story, specialist authority and the conservation philosophy behind each route.",
    image: specialists[0]?.image ?? heroJourney.image
  },
  {
    key: "contact",
    label: "Contact Us",
    href: "/contact",
    copy: "A direct line for private safari planning, photo expeditions and specialist-led route conversations.",
    image: featuredDestination.image
  }
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState(menuItems[0].key);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    setActiveMenuKey(menuItems[0].key);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <BrandMark className="wordmark" />
        <div className="header-spacer" aria-hidden="true" />
        <Link className="header-link" href="/contact">
          Contact Us
        </Link>
        <Link className="header-cta" href="/plan">
          Plan a Journey
        </Link>
        <button
          className="menu-button"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-full-menu"
          onClick={() => setOpen((current) => !current)}
        >
          <Menu size={18} />
        </button>
      </header>
      <div
        className={open ? "site-full-menu is-open" : "site-full-menu"}
        id="site-full-menu"
        aria-hidden={!open}
      >
        <div className="site-full-menu-top">
          <BrandMark className="wordmark" />
          <button
            className="menu-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
            <span>Close</span>
          </button>
        </div>
        <div className="site-full-menu-grid">
          <nav className="site-full-menu-list" aria-label="Expanded site menu">
            {menuItems.map((item, index) => (
              <Link
                href={item.href}
                className="site-full-menu-row"
                key={item.href}
                data-active={activeMenuKey === item.key ? "true" : undefined}
                onClick={() => setOpen(false)}
                onFocus={() => setActiveMenuKey(item.key)}
                onPointerEnter={() => setActiveMenuKey(item.key)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{item.label}</h2>
                  <p>{item.copy}</p>
                </div>
                <MoveRight size={24} />
              </Link>
            ))}
          </nav>
          <aside className="site-full-menu-image">
            <div className="site-full-menu-image-stack" aria-hidden="true">
              {menuItems.map((item) => (
                <img
                  src={item.image.src}
                  alt=""
                  className={activeMenuKey === item.key ? "is-active" : ""}
                  key={item.key}
                />
              ))}
            </div>
          </aside>
          <div className="site-full-menu-footer">
            <span>Tiger season / November to May</span>
            <Link href="/plan">Plan a private safari</Link>
          </div>
        </div>
      </div>
    </>
  );
}
