import {headers} from 'next/headers';
import {QuickActions} from '@/components/QuickActions';
import {cmsPathHeader,localizedRequest} from '@/lib/cms/localized-request';
import {loadLocalizedVisitor} from '@/lib/cms/localized-visitor';
import {LocalizedDocumentNavigation} from '@/components/LocalizedDocumentNavigation';
import {Header} from '@/components/Header';
import {CmsFooter} from '@/components/CmsFooter';
import {CmsMessages} from '@/components/CmsMessages';
import {CookiePreferences} from '@/components/CookiePreferences';
import {cache} from 'react';
import {readBrandSettings} from '@/lib/cms/brand-settings';
import {brandMetadata,publishedOrganizationSchema} from '@/lib/cms/brand-metadata';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {rootSeoMetadata} from '@/lib/cms/root-seo-metadata';
import { SiteCookiePreferences } from '@/components/SiteCookiePreferences';
import { FunnelTracking } from "@/components/FunnelTracking";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./editorial-surfaces.css";
import { StoreCartProvider } from "@/components/StoreCart";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMessages } from "@/components/SiteMessages";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema } from "@/lib/structured-data";

const localizedContext=cache(async()=>process.env.CMS_LOCALIZED_PAGES_ENABLED==='true'?localizedRequest((await headers()).get(cmsPathHeader)??''):null);
const loadBrandSettings=cache(()=>readBrandSettings());
const legacyMetadata: Metadata = {
  title: {
    default: "Safari Crafters | Where the wild still breathes freely.",
    template: "%s | Safari Crafters"
  },
  description:
    "Ultra-luxury, photography-led private safaris across India, Africa and the wild places between.",
  metadataBase: new URL("https://safaricrafters.com"),
  openGraph: {
    title: "Safari Crafters",
    description:
      "Private safari journeys, photography tours and editorial field notes shaped by named specialists.",
    url: "https://safaricrafters.com",
    siteName: "Safari Crafters",
    type: "website",
    images: [{ url: "/assets/safari-crafters/ranthambhore-tiger-family-restored-v2.png", width: 1261, height: 1261, alt: "Tiger family walking through Ranthambhore" }]
  },
  twitter: { card: "summary_large_image", title: "Safari Crafters", description: "Private, photography-led safari journeys." },
  alternates: { canonical: "/" }
};

export async function generateMetadata():Promise<Metadata>{
  const localized=await localizedContext();
  if(localized)return {metadataBase:new URL('https://safaricrafters.com')};
  const [defaults,branding]=await Promise.all([readSeoDefaults(),loadBrandSettings()]);
  const metadata=defaults?rootSeoMetadata(legacyMetadata,defaults):legacyMetadata;
  return branding?brandMetadata(metadata,branding.brand):metadata;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#142015"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localized=await localizedContext();
  if(localized){
    const content=await loadLocalizedVisitor(localized.path,localized.locale);
    const shell=content?.shell;
    return <html lang={localized.locale} data-scroll-behavior="smooth"><body><LocalizedDocumentNavigation/>{shell?<>
      <a className="skip-link" href="#main">{shell.interfaceText.skipLink}</a><FunnelTracking/>
      <Header cmsHeader={shell.header} showCart={false}/>
      <main id="main"><CmsMessages settings={shell.settings}>{children}</CmsMessages></main>
      <CmsFooter settings={shell.settings} interfaceText={shell.interfaceText}/>
      <CookiePreferences settings={shell.settings.cookies} saveError={shell.interfaceText.cookieSaveError}/>
    </>:children}</body></html>;
  }
  const branding=await loadBrandSettings();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <LocalizedDocumentNavigation/>
        <JsonLd data={branding?publishedOrganizationSchema(branding,"https://safaricrafters.com"):organizationSchema()} />
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <FunnelTracking />
        <StoreCartProvider>
        <SiteHeader />
        <main id="main"><SiteMessages>{children}</SiteMessages></main>
        <SiteFooter />
        <SiteCookiePreferences />
        <QuickActions />
        </StoreCartProvider>
      </body>
    </html>
  );
}
