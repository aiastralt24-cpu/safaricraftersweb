import Image from "next/image";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { ImageAsset } from "@/lib/data";
import "./PageHero.css";

type PageHeroProps = {
  title: string;
  copy: string;
  image: ImageAsset;
  meta?: string;
  focalPoint?: string;
  showImage?: boolean;
  variant?: "default" | "destination";
  breadcrumbs?: BreadcrumbItem[];
};

export function PageHero({ title, copy, image, meta, focalPoint, showImage = true, variant = "default", breadcrumbs }: PageHeroProps) {
  const titleLength = title.replace(/\s+/g, " ").trim().length;
  const titleScale = titleLength >= 36 ? " page-hero-title-long" : titleLength >= 25 ? " page-hero-title-medium" : "";
  const showCredit = showImage && image.credit !== "AI-generated destination illustration";

  return (
    <section className={`page-hero${showImage ? "" : " page-hero-textual"}${variant === "destination" ? ` page-hero-destination${titleScale}` : ""}`}>
      {showImage ? <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        loading="eager"
        sizes="100vw"
        style={{ objectPosition: focalPoint || image.focalPoint || "center" }}
      /> : null}
      <div className="page-hero-scrim" />
      <div className="container page-hero-content reveal">
        {variant !== "destination" && breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} variant="hero" /> : null}
        {meta ? <p className="page-hero-meta">{meta}</p> : null}
        <h1 className="h1">{title}</h1>
        <p className="page-hero-description">{copy}</p>
        {variant === "destination" && breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} variant="hero" /> : null}
      </div>
      {showCredit ? <p className="page-hero-credit">{image.credit}</p> : null}
    </section>
  );
}
