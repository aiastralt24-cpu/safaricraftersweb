"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, MoveRight, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CartButton } from "@/components/StoreCart";
import { BrandMark } from "@/components/BrandMark";
import type { ImageAsset } from "@/lib/data";
import { destinations, expeditions, journeys } from "@/lib/data";
import "./Header.css";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const photoExpedition = expeditions[0];
const privateAviationMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/amer-fort-original-scaled-31b56cd7.jpg",
  alt: "Amer Fort in Jaipur",
  credit: "Safari Crafters archive"
};

const storeMenuImage: ImageAsset = {
  src: "/assets/store/ghosts-of-the-granite-hills-book.jpg",
  alt: "Ghosts of the Granite Hills red clothbound photographic book on granite stone",
  credit: "Safari Crafters archive"
};

const primaryMenuItems = [
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
    key: "photo-expeditions",
    label: "Photo Expeditions",
    href: "/photo-expeditions",
    image: photoExpedition.image
  },
  {
    key: "private-aviation",
    label: "Private Jet Safaris",
    href: "/private-aviation",
    image: privateAviationMenuImage
  },
  {
    key: "store",
    label: "Store",
    href: "/store",
    image: storeMenuImage
  }
];

const secondaryMenuItems = [
  {
    key: "journal",
    label: "Journal",
    href: "/journal"
  },
  {
    key: "reviews",
    label: "Guest Notes",
    href: "/reviews"
  },
  {
    key: "conservation-commitment",
    label: "Conservation",
    href: "/conservation-commitment"
  },
  {
    key: "about",
    label: "About",
    href: "/about"
  },
  {
    key: "contact",
    label: "Contact",
    href: "/contact"
  }
];

const menuItems = [...primaryMenuItems, ...secondaryMenuItems];

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
  "/specialists",
  "/store",
  "/studio"
];

export function Header() {
  const pathname = usePathname();
  const matchedPrimaryMenuItem = primaryMenuItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const currentPrimaryMenuKey = matchedPrimaryMenuItem?.key ?? (pathname === "/" ? primaryMenuItems[0].key : null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(currentPrimaryMenuKey);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isKnownRoute =
    pathname === "/" || knownRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hasLightOpening = pathname.startsWith("/search") || pathname.startsWith("/legal");
  const useSolidHeader = scrolled || !isKnownRoute || hasLightOpening;
  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const sectionItem = menuItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    ?? (pathname.startsWith("/guided-bespoke-safaris") ? primaryMenuItems[0] : undefined);
  const sectionHref = sectionItem?.href ?? (pathname.startsWith("/plan") ? "/plan" : undefined);
  const sectionLabel = sectionItem?.label ?? (pathname.startsWith("/plan") ? "Private journey planning" : "Safari Crafters");

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

    setActiveMenuKey(currentPrimaryMenuKey);
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
  }, [open, currentPrimaryMenuKey]);

  return (
    <>
      <header
        className={`site-header${useSolidHeader ? " is-scrolled" : ""}${visible ? "" : " is-hidden"}`}
        style={{ "--header-progress": `${scrollProgress}%` } as CSSProperties}
      >
        <BrandMark className="wordmark" />
        {sectionHref && pathname !== sectionHref ? (
          <Link className="header-context" href={sectionHref} aria-label={`Back to ${sectionLabel}`}>{sectionLabel}</Link>
        ) : (
          <span className="header-context" aria-live="polite">{sectionLabel}</span>
        )}
        <div className="header-shop-actions">
        <CartButton />
        <Link className="header-cta" href={isStore ? "/" : "/plan"}>
          {isStore ? "Back to Main Site" : "Plan a Journey"}
        </Link>
        </div>
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
          <div className="site-full-menu-navigation">
            <nav className="site-full-menu-list" aria-label="Primary site menu">
              {primaryMenuItems.map((item) => (
                <Link
                  href={item.href}
                  className="site-full-menu-row"
                  key={item.href}
                  data-active={activeMenuKey === item.key ? "true" : undefined}
                  aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  onFocus={() => setActiveMenuKey(item.key)}
                  onPointerEnter={() => setActiveMenuKey(item.key)}
                >
                  <h2>{item.label}</h2>
                  <MoveRight size={24} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <Link className="site-full-menu-plan" href="/plan" onClick={() => setOpen(false)}>
              <span>Plan a Journey</span>
              <MoveRight size={20} aria-hidden="true" />
            </Link>
            <nav className="site-full-menu-secondary" aria-label="More from Safari Crafters">
              {secondaryMenuItems.map((item) => (
                <Link href={item.href} key={item.href} onClick={() => setOpen(false)} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <aside className="site-full-menu-image">
            <div className="site-full-menu-image-stack" aria-hidden="true">
              {primaryMenuItems.map((item) => (
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
        </div>
      </div>
    </>
  );
}
