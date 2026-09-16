import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'sharp', 'web-push'],
  outputFileTracingIncludes: { '/**': ['./node_modules/@electric-sql/pglite/dist/**'] },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }, { protocol: 'https', hostname: '**' }],
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
    return [{ source: '/(.*)', headers: security }];
  },
};

export default nextConfig;
