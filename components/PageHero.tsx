import { ImageAsset } from "@/lib/data";
import "./PageHero.css";

type PageHeroProps = {
  title: string;
  copy: string;
  image: ImageAsset;
  meta?: string;
  className?: string;
};

export function PageHero({ title, copy, image, meta, className }: PageHeroProps) {
  return (
    <section className={`page-hero${className ? ` ${className}` : ""}`}>
      <img src={image.src} alt={image.alt} />
      <div className="page-hero-scrim" />
      <div className="container page-hero-content reveal">
        {meta ? <p className="page-hero-meta">{meta}</p> : null}
        <h1 className="h1">{title}</h1>
        <p>{copy}</p>
      </div>
      <p className="page-hero-credit">{image.credit}</p>
    </section>
  );
}
