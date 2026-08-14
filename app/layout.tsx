import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
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
      "Private safari journeys, photo expeditions and editorial field notes shaped by named specialists.",
    url: "https://safaricrafters.com",
    siteName: "Safari Crafters",
    type: "website",
    images: [{ url: "/assets/safari-crafters/ranthambhore-tiger-family-restored-v2.png", width: 1261, height: 1261, alt: "Tiger family walking through Ranthambhore" }]
  },
  twitter: { card: "summary_large_image", title: "Safari Crafters", description: "Private, photography-led safari journeys." },
  alternates: { canonical: "/" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#142015"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <JsonLd data={organizationSchema()} />
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
