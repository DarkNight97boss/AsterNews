import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'sharp', 'web-push'],
  outputFileTracingIncludes: { '/**': ['./node_modules/@electric-sql/pglite/dist/**'] },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }, { protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 130, 200, 260, 300, 400],
    qualities: [60, 65, 70, 75],
  },
  experimental: {
    serverActions: { bodySizeLimit: '60mb' },
    inlineCss: true,
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
    ];
    // I widget (/widget/…) devono poter essere incorporati in siti terzi: niente X-Frame-Options né frame-ancestors per loro.
    const framing = new Set(['X-Frame-Options', 'Content-Security-Policy', 'Cross-Origin-Opener-Policy']);
    return [{ source: '/((?!widget/).*)', headers: security }, { source: '/widget/:path*', headers: security.filter((h) => !framing.has(h.key)) }];
  },
};

export default nextConfig;
