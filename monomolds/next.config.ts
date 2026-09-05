import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Allow phones on our Wi-Fi to connect to Next.js development tools.
  // Update this address if the Mac's local IP changes.
  allowedDevOrigins: ['192.168.1.47'],

  images: {
    remotePatterns: [
      // Tutaj później dodasz domenę R2/CDN
      // z którego będą serwowane zdjęcia foremek
      // np. pub-xyz.r2.dev albo własna domena CDN
    ],
  },
};

export default nextConfig;
