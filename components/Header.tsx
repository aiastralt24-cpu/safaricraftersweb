"use client";

import {CmsBrandMark} from './CmsBrandMark';
import type {PublishedHeader} from '../lib/cms/published-header';
import {CmsNavigationLinks} from './CmsNavigationLinks';
import type {PublishedNavigation} from '../lib/cms/published-navigation';
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
    label: "Photography Tours",
    href: "/photo-expeditions",
    image: photoExpedition.image
  },
  {
    key: "guided-bespoke-safaris",
    label: "Bespoke Safaris",
    href: "/guided-bespoke-safaris",
    image: {
      src: "/assets/safari-crafters/laipikia-001e24e7.jpg",
      alt: "Black leopard walking through the Laikipia landscape",
      credit: "Safari Crafters archive"
    }
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
  { key: "mice", label: "Corporate Journeys", href: "/mice" },
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
  "/mice",
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

export function Header({cmsMenu:providedMenu,cmsHeader,menuId='site-full-menu',showCart=true}:{cmsMenu?:PublishedNavigation;cmsHeader?:PublishedHeader;menuId?:string;showCart?:boolean} = {}) {
  const cmsMenu=cmsHeader?.main??providedMenu;
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
  const hasLightOpening = pathname === "/contact" || pathname.startsWith("/search") || pathname.startsWith("/legal");
  const useSolidHeader = (cmsHeader&&cmsHeader.variant!=='transparent') || scrolled || !isKnownRoute || hasLightOpening;
  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const contextItems = cmsMenu?cmsMenu.items.flatMap(item=>item.link?[{href:item.link.href,label:item.label}]:[]):menuItems;
  const sectionItem = contextItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const sectionHref = sectionItem?.href ?? (!cmsHeader&&pathname.startsWith("/plan") ? "/plan" : undefined);
  const sectionLabel = sectionItem?.label ?? cmsHeader?.brand.name ?? (pathname.startsWith("/plan") ? "Private journey planning" : "Safari Crafters");

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
        className={`site-header${useSolidHeader ? " is-scrolled" : ""}${visible||cmsHeader?.sticky===false ? "" : " is-hidden"}${cmsHeader?` cms-configured-header cms-header-${cmsHeader.variant}${cmsHeader.sticky?"":" cms-header-static"}`:""}`}
        style={{ "--header-progress": `${scrollProgress}%` } as CSSProperties}
      >
        {cmsHeader?<CmsBrandMark brand={cmsHeader.brand} homeHref={cmsHeader.interfaceText.homeHref} homeLabel={cmsHeader.interfaceText.homeLabel}/>:<BrandMark className="wordmark" />}
        {sectionHref && pathname !== sectionHref ? (
          <Link className="header-context" href={sectionHref} aria-label={cmsHeader?sectionLabel:`Back to ${sectionLabel}`}>{sectionLabel}</Link>
        ) : (
          <span className="header-context" aria-live="polite">{sectionLabel}</span>
        )}
        <div className="header-shop-actions">
        {showCart&&<CartButton />}
        {cmsHeader?(cmsHeader.cta&&<Link className="header-cta" href={cmsHeader.cta.href} target={cmsHeader.cta.newWindow?"_blank":undefined} rel={cmsHeader.cta.newWindow?"noopener noreferrer":undefined}>{cmsHeader.cta.label}</Link>):<Link className="header-cta" href={isStore ? "/" : "/plan"}>
          {isStore ? "Back to Main Site" : "Plan a Journey"}
        </Link>}
        </div>
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-label={open ? (cmsHeader?.interfaceText.closeMenu??"Close menu") : (cmsHeader?.interfaceText.openMenu??"Open menu")}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
        >
          <Menu size={18} />
        </button>
      </header>
      <div
        ref={menuRef}
        className={open ? "site-full-menu is-open" : "site-full-menu"}
        id={menuId}
        aria-hidden={!open}
        aria-modal={open ? "true" : undefined}
        role="dialog"
        aria-label={cmsMenu?.title??"Site menu"}
      >
        <div className="site-full-menu-top">
          {cmsHeader?<CmsBrandMark brand={cmsHeader.brand} homeHref={cmsHeader.interfaceText.homeHref} homeLabel={cmsHeader.interfaceText.homeLabel}/>:<BrandMark className="wordmark" />}
          <button
            className="menu-close"
            type="button"
            aria-label={cmsHeader?.interfaceText.closeMenu??"Close menu"}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
            <span>{cmsHeader?.interfaceText.closeMenu??"Close"}</span>
          </button>
        </div>
        <div className={cmsMenu?"site-full-menu-grid cms-menu-grid":"site-full-menu-grid"}>
          {cmsMenu?<div className="site-full-menu-navigation">
            {cmsHeader?.brand.tagline&&<p>{cmsHeader.brand.tagline}</p>}
            <div className={cmsHeader?'cms-menu-desktop':undefined}><CmsNavigationLinks menu={cmsMenu} pathname={pathname} onNavigate={()=>setOpen(false)}/></div>
            {cmsHeader&&<div className='cms-menu-mobile'><CmsNavigationLinks menu={cmsHeader.mobile} pathname={pathname} onNavigate={()=>setOpen(false)}/></div>}
            {cmsHeader?.utility&&<div className='cms-menu-utility'><CmsNavigationLinks menu={cmsHeader.utility} pathname={pathname} onNavigate={()=>setOpen(false)}/></div>}
            {cmsHeader&&cmsHeader.featured.length>0&&<nav className='cms-header-featured' aria-label={cmsHeader.interfaceText.featuredContent}>{cmsHeader.featured.map(item=><Link key={item.recordId} href={item.href} onClick={()=>setOpen(false)}>{item.title}</Link>)}</nav>}
          </div>:<>
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
          </aside></>}
        </div>
      </div>
    </>
  );
}
