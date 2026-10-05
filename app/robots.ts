import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/studio/", "/portal/", "/search"]
    },
    sitemap: "https://safaricrafters.com/sitemap.xml"
  };
}
