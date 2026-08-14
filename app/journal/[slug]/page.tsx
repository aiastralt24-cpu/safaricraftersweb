import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MediaGallery } from "@/components/MediaGallery";
import { getArticle, journal } from "@/lib/data";
import { articleSchema, breadcrumbSchema, siteUrl } from "@/lib/structured-data";
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
    description: article.description,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: `${siteUrl}/journal/${article.slug}`,
      publishedTime: new Date(article.date).toISOString(),
      images: [{ url: article.image.src, alt: article.image.alt }]
    }
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const heroImage = article.gallery.find((image) => image.src !== article.image.src) || article.image;
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "The Journal", path: "/journal" },
    { name: article.title, path: `/journal/${article.slug}` }
  ];

  return (
    <>
      <JsonLd data={articleSchema(article)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <article className="article">
        <section className="article-hero">
          <img src={heroImage.src} alt={heroImage.alt} />
          <div className="article-scrim" />
          <div className="container article-hero-content">
            <p className="eyebrow">{article.category}</p>
            <h1 className="display">{article.title}</h1>
            <p>
              {article.author} · {article.date} · {article.readTime}
            </p>
          </div>
        </section>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "The Journal", href: "/journal" }, { label: article.title }]} />
        <div className="article-body">
          <p className="intro">{article.description}</p>
          {article.body.map((paragraph, index) => (
            <p key={`${article.slug}-${index}`}>{paragraph}</p>
          ))}
          <blockquote className="serif">{article.quote}</blockquote>
          {article.gallery.length ? (
            <MediaGallery images={article.gallery.filter((image) => image.src !== heroImage.src && image.src !== article.image.src).slice(0, 4)} label={`${article.title} gallery`} />
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
    </>
  );
}
