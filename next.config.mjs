/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async redirects() {
    return [
      { source: "/tours", destination: "/photo-expeditions", permanent: true },
      { source: "/itineraries", destination: "/journeys", permanent: true },
      { source: "/blogs", destination: "/journal", permanent: true },
      { source: "/blogs/:slug", destination: "/journal/:slug", permanent: true },
      { source: "/blog/:slug", destination: "/journal/:slug", permanent: true },
      { source: "/itineraries/:slug", destination: "/journeys/:slug", permanent: true },
      { source: "/tours/:slug", destination: "/photo-expeditions/:slug", permanent: true }
    ];
  }
};

export default nextConfig;
