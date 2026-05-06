import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, journal } from "@/lib/data";
import "../../article.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return journal.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <article className="article">
      <section className="article-hero">
        <img src={article.image.src} alt={article.image.alt} />
        <div className="article-scrim" />
        <div className="container article-hero-content">
          <p className="eyebrow">{article.category}</p>
          <h1 className="display">{article.title}</h1>
          <p>
            {article.author} · {article.date} · {article.readTime}
          </p>
        </div>
      </section>
      <div className="article-body">
        <p className="intro">{article.description}</p>
        {article.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <blockquote className="serif">{article.quote}</blockquote>
        {article.gallery.length ? (
          <div className="article-gallery">
            {article.gallery.slice(0, 4).map((image) => (
              <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />
            ))}
          </div>
        ) : null}
        <p className="caption">{article.image.credit}</p>
        <div className="article-cta">
          <h2 className="h3">Shape this field note into a journey.</h2>
          <Link className="button button-solid" href="/plan">
            Plan a Journey
          </Link>
        </div>
      </div>
    </article>
  );
}
