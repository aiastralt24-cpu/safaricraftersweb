"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, MoveRight, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BrandMark } from "@/components/BrandMark";
import type { ImageAsset } from "@/lib/data";
import { destinations, expeditions, journeys, specialists } from "@/lib/data";
import "./Header.css";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const photoExpedition = expeditions[0];
const journalMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/dsc8123-789x1024-1f0b8c48.jpg",
  alt: "Tiger walking toward the camera",
  credit: "Safari Crafters archive"
};

const guidedSafariMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/laipikia-001e24e7.jpg",
  alt: "Black leopard walking through Laikipia",
  credit: "Safari Crafters archive"
};

const menuItems = [
  {
    key: "journeys",
    label: "Journeys",
    href: "/journeys",
    image: heroJourney.image
  },
  {
    key: "destinations",
    label: "Destinations",
    href: "/destinations",
    image: featuredDestination.image
  },
  {
    key: "scheduled-departures",
    label: "Scheduled Departures",
    href: "/scheduled-departures",
    image: photoExpedition.image
  },
  {
    key: "guided-bespoke-safaris",
    label: "Travel With A Private Guide",
    href: "/guided-bespoke-safaris",
    image: guidedSafariMenuImage
  },
  {
    key: "journal",
    label: "Journal",
    href: "/journal",
    image: journalMenuImage
  },
  {
    key: "about",
    label: "About",
    href: "/about",
    image: specialists[0]?.image ?? heroJourney.image
  }
];

const utilityLinks = [
  { label: "Photo Expeditions", href: "/photo-expeditions" },
  { label: "Guest Notes", href: "/reviews" },
  { label: "Conservation", href: "/conservation-commitment" },
  { label: "Private Aviation", href: "/private-aviation" },
  { label: "Store", href: "/store" },
  { label: "Contact", href: "/contact" }
];

const knownRoutePrefixes = [
  "/about",
  "/admin",
  "/concept",
  "/conservation-commitment",
  "/contact",
  "/destinations",
  "/guided-bespoke-safaris",
  "/journal",
  "/journeys",
  "/legal",
  "/photo-expeditions",
  "/plan",
  "/private-aviation",
  "/reviews",
  "/search",
  "/scheduled-departures",
  "/specialists",
  "/store",
  "/studio"
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeMenuKey, setActiveMenuKey] = useState(menuItems[0].key);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isKnownRoute =
    pathname === "/" || knownRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hasLightOpening = pathname.startsWith("/search") || pathname.startsWith("/legal");
  const useSolidHeader = scrolled || !isKnownRoute || hasLightOpening;
  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const sectionLabel = menuItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label
    ?? utilityLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label
    ?? (pathname.startsWith("/plan") ? "Safari planning" : "Safari Crafters");

  useEffect(() => {
    let previousY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - previousY;
        const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrolled(currentY > 24);
        setScrollProgress(Math.min(100, Math.max(0, (currentY / scrollable) * 100)));
        if (currentY < 80) setVisible(true);
        else if (Math.abs(delta) > 6) setVisible(delta < 0);
        previousY = currentY;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setActiveMenuKey(menuItems[0].key);
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;
      const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      menuRef.current?.querySelector<HTMLElement>(".menu-close")?.focus();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>(".menu-close")?.focus());

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      menuButtonRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <header
        className={`site-header${useSolidHeader ? " is-scrolled" : ""}${visible ? "" : " is-hidden"}`}
        style={{ "--header-progress": `${scrollProgress}%` } as CSSProperties}
      >
        <BrandMark className="wordmark" />
        <span className="header-context" aria-live="polite">{sectionLabel}</span>
        <Link className="header-cta" href={isStore ? "/store#store-categories" : "/plan"}>
          {isStore ? "Browse Store" : "Plan a Journey"}
        </Link>
        <button
          ref={menuButtonRef}
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
        ref={menuRef}
        className={open ? "site-full-menu is-open" : "site-full-menu"}
        id="site-full-menu"
        aria-hidden={!open}
        aria-modal={open ? "true" : undefined}
        role="dialog"
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
                <h2>{item.label}</h2>
                <MoveRight size={24} />
              </Link>
            ))}
          </nav>
          <aside className="site-full-menu-image">
            <div className="site-full-menu-image-stack" aria-hidden="true">
              {menuItems.map((item) => (
                <Image
                  src={item.image.src}
                  alt=""
                  width={1200}
                  height={1600}
                  sizes="40vw"
                  className={activeMenuKey === item.key ? "is-active" : ""}
                  key={item.key}
                />
              ))}
            </div>
          </aside>
          <div className="site-full-menu-footer">
            <nav aria-label="More from Safari Crafters">
              {utilityLinks.map((item) => (
                <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
              ))}
            </nav>
            <Link href="/plan" onClick={() => setOpen(false)}>Plan a Safari</Link>
          </div>
        </div>
      </div>
    </>
  );
}
