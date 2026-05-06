import Link from "next/link";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { journalCategories, journeyCategories, navItems } from "@/lib/data";
import "./Footer.css";

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
          {journeyCategories.slice(0, 5).map((item) => (
            <Link key={item} href="/journeys">
              {item}
            </Link>
          ))}
        </div>
        <div>
          <h2>The Journal</h2>
          {journalCategories.map((item) => (
            <Link key={item} href="/journal">
              {item}
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
