import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

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
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
