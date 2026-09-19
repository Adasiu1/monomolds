import path from "node:path";
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  turbopack: {
    root: path.join(__dirname),
  },

  async redirects() {
    return [
      { source: "/shop/:path*", destination: "/sklep/:path*", permanent: true },
      { source: "/bundles/:path*", destination: "/zestawy/:path*", permanent: true },
      { source: "/cart/:path*", destination: "/koszyk/:path*", permanent: true },
      { source: "/checkout/:path*", destination: "/zamowienie/:path*", permanent: true },
    ];
  },

  async rewrites() {
    return [
      { source: "/sklep/:path*", destination: "/shop/:path*" },
      { source: "/zestawy/:path*", destination: "/bundles/:path*" },
      { source: "/koszyk/:path*", destination: "/cart/:path*" },
      { source: "/zamowienie/:path*", destination: "/checkout/:path*" },
    ];
  },

  // Allow phones on our Wi-Fi to connect to Next.js development tools.
  // Update this address if the Mac's local IP changes.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.47'],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/sign/**" },
      { protocol: "http", hostname: "localhost", port: "54321", pathname: "/storage/v1/object/sign/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/sign/**" },
    ],
  },
};

export default nextConfig;
