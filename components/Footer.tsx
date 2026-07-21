import Link from "next/link";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { navItems } from "@/lib/data";
import "./Footer.css";

const footerJourneyLinks = [
  { label: "Signature Safari Routes", href: "/journeys/big-cats-of-india" },
  { label: "Private India Safaris", href: "/journeys/heart-of-the-wildcentral-indias-six-park-safari" },
  { label: "High Himalaya", href: "/journeys/where-sky-meets-earthladakh-realm-of-the-snow-leopard" },
  { label: "Big Cat Journeys", href: "/journeys/whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats" },
  { label: "Heritage and Wildlife", href: "/journeys/history-majesty-the-wildgolden-triangle-safari" }
];

const footerJournalLinks = [
  { label: "Low-Angle Photography", href: "/journal/achieving-low-angle-on-a-wildlife-safari" },
  { label: "Safari Booking Windows", href: "/journal/booking-wildlife-safaris-how-early-is-not-too-late" },
  { label: "The Leopard’s India", href: "/journal/indias-silent-sovereign-the-leopard-and-the-art-of-living" },
  { label: "Rebari & Jawai", href: "/journal/living-by-old-ways-the-rebari-reverence-for-nature" },
  { label: "Snow Leopard Packing", href: "/journal/what-to-pack-for-a-snow-leopard-safari" }
];

const footerDestinationLinks = [
  { label: "India Atlas", href: "/destinations#india" },
  { label: "Africa Atlas", href: "/destinations#africa" },
  { label: "Americas Atlas", href: "/destinations#americas" },
  { label: "Guest Notes", href: "/reviews" },
  { label: "Begin Planning", href: "/plan" }
];

export function Footer() {
  return (
    <footer className="footer">
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
            <Link href="/journal" aria-label="Safari Crafters Instagram stories">
              <Instagram size={18} />
            </Link>
          </div>
        </div>
        <div>
          <h2>Explore</h2>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Journeys</h2>
          {footerJourneyLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Destinations</h2>
          {footerDestinationLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h2>The Journal</h2>
          {footerJournalLinks.map((item) => (
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
