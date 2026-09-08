import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Allow phones on our Wi-Fi to connect to Next.js development tools.
  // Update this address if the Mac's local IP changes.
  allowedDevOrigins: ['192.168.1.47'],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/sign/**" },
      { protocol: "http", hostname: "localhost", port: "54321", pathname: "/storage/v1/object/sign/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/sign/**" },
    ],
  },
};

export default nextConfig;
