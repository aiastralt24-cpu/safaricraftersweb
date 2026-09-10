import Link from "next/link";
import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import "./Footer.css";

const exploreLinks = [
  { label: "Destinations", href: "/destinations" },
  { label: "Journeys", href: "/journeys" },
  { label: "The Journal", href: "/journal" },
  { label: "About", href: "/about" }
];

const atlasLinks = [
  { label: "India Atlas", href: "/destinations/india" },
  { label: "Africa Atlas", href: "/destinations/africa" },
  { label: "Americas Atlas", href: "/destinations/americas" },
  { label: "Arctic & Beyond", href: "/destinations/arctic-beyond" }
];

const travelStyleLinks = [
  { label: "Private Journeys", href: "/journeys" },
  { label: "Guided Bespoke Safaris", href: "/guided-bespoke-safaris" },
  { label: "Photo Expeditions", href: "/photo-expeditions" },
  { label: "Private Jet Safaris", href: "/private-aviation" },
  { label: "Conservation", href: "/conservation-commitment" }
];

const companyLinks = [
  { label: "Begin Planning", href: "/plan" },
  { label: "Our Specialists", href: "/specialists" },
  { label: "Guest Notes", href: "/reviews" },
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
        <Link href="/plan">Begin a Private Journey <span aria-hidden="true">↗</span></Link>
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
            <Link href="/contact" aria-label="WhatsApp Safari Crafters">
              <MessageCircle size={18} />
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
          <h2>Explore</h2>
          {exploreLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Regional Atlases</h2>
          {atlasLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Travel Styles</h2>
          {travelStyleLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Plan &amp; Company</h2>
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
