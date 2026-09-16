import Link from "next/link";
import { Facebook, Instagram, Mail } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import "./Footer.css";

const travelLinks = [
  { label: "Private Tailor-Made Journeys", href: "/journeys" },
  { label: "Scheduled Departures", href: "/scheduled-departures" },
  { label: "Photo Expeditions", href: "/photo-expeditions" },
  { label: "Travel With a Private Guide", href: "/guided-bespoke-safaris" },
  { label: "Private Aviation", href: "/private-aviation" }
];

const discoverLinks = [
  { label: "Destinations", href: "/destinations" },
  { label: "Journal", href: "/journal" },
  { label: "Guest Notes", href: "/reviews" },
  { label: "Conservation", href: "/conservation-commitment" },
  { label: "Store", href: "/store" }
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Plan a Safari", href: "/plan" },
  { label: "Contact Us", href: "/contact" }
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-journey-cta">
        <div>
          <p className="eyebrow">A journey of your own</p>
          <h2>Begin with a conversation.</h2>
        </div>
        <Link href="/plan">Plan a Safari <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="container footer-grid">
        <div>
          <BrandMark className="footer-wordmark" />
          <p>
            Private safari journeys, photo expeditions and field notes from places where
            the wild still breathes freely.
          </p>
          <div className="footer-icons" aria-label="Social and contact links">
            <Link href="/contact" aria-label="Email Safari Crafters">
              <Mail size={18} />
            </Link>
            <a
              href="https://www.instagram.com/safaricrafters/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Safari Crafters on Instagram (opens in a new tab)"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://www.facebook.com/safaricrafters/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Safari Crafters on Facebook (opens in a new tab)"
            >
              <Facebook size={18} />
            </a>
          </div>
        </div>
        <div>
          <h2>Travel</h2>
          {travelLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Discover</h2>
          {discoverLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Company</h2>
          {companyLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Safari Crafters.</span>
        <span>
          <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> ·{" "}
          <Link href="/legal/cookies">Cookies</Link>
        </span>
      </div>
    </footer>
  );
}
