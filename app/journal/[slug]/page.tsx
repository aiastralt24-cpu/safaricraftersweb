import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {cache} from 'react';
import {CmsJournal} from '@/components/CmsJournal';
import {readPublishedJournal,publicJournalConfig} from '@/lib/cms/public-journal-runtime';
import {usesCmsJournal,publishedJournalMetadata,publishedJournalStructuredData} from '@/lib/cms/journal-route';
import { EditorialFilm } from "@/components/EditorialFilm";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MediaGallery } from "@/components/MediaGallery";
import { getArticle, journal } from "@/lib/data";
import { articleSchema, breadcrumbSchema, siteUrl } from "@/lib/structured-data";
import "../../article.css";

export const dynamic='force-dynamic';
const loadCmsArticle=cache((slug:string)=>readPublishedJournal(slug,publicJournalConfig()));

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  if(usesCmsJournal())return [];
  return journal.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if(usesCmsJournal()){const article=await loadCmsArticle(slug);if(!article)notFound();return publishedJournalMetadata(article,await readSeoDefaults());}
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.description,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      title: article.seo?.title || article.title,
      description: article.seo?.description || article.description,
      type: "article",
      url: `${siteUrl}/journal/${article.slug}`,
      publishedTime: new Date(article.date).toISOString(),
      images: [{ url: (article.seo?.socialImage || article.image).src, alt: (article.seo?.socialImage || article.image).alt }]
    }
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  if(usesCmsJournal()){const article=await loadCmsArticle(slug);if(!article)notFound();return <><JsonLd data={publishedJournalStructuredData(article,siteUrl)}/><CmsJournal article={article}/></>;}
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
            <Breadcrumbs items={breadcrumbs.map((item, index) => ({ label: item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))} variant="hero" />
            <p className="eyebrow">{article.category}</p>
            <h1 className="display">{article.title}</h1>
            <p>
              {article.author} · {article.date} · {article.readTime}
            </p>
          </div>
        </section>
        <div className="article-body">
          <p className="intro">{article.description}</p>
          {article.body.map((paragraph, index) => (
            <p key={`${article.slug}-${index}`}>{paragraph}</p>
          ))}
          <blockquote className="serif">{article.quote}</blockquote>
          {article.gallery.length ? (
            <MediaGallery images={article.gallery.filter((image) => image.src !== heroImage.src && image.src !== article.image.src).slice(0, 4)} label={`${article.title} gallery`} />
          ) : null}
      <EditorialFilm video={article.video} />
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
