import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      // Tutaj później dodasz domenę R2/CDN
      // z którego będą serwowane zdjęcia foremek
      // np. pub-xyz.r2.dev albo własna domena CDN
    ],
  },
};

export default nextConfig;