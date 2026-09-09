import Image from "next/image";
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
};

export function PageHero({ title, copy, image, meta, focalPoint, showImage = true, variant = "default" }: PageHeroProps) {
  return (
    <section className={`page-hero${showImage ? "" : " page-hero-textual"}${variant === "destination" ? " page-hero-destination" : ""}`}>
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
        {meta ? <p className="page-hero-meta">{meta}</p> : null}
        <h1 className="h1">{title}</h1>
        <p>{copy}</p>
      </div>
      {showImage ? <p className="page-hero-credit">{image.credit}</p> : null}
    </section>
  );
}
