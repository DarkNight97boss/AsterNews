import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'sharp', 'web-push'],
  outputFileTracingIncludes: { '/**': ['./node_modules/@electric-sql/pglite/dist/**'] },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }, { protocol: 'https', hostname: '**' }],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 130, 200, 260, 300, 400],
    qualities: [60, 65, 75],
  },
  experimental: {
    serverActions: { bodySizeLimit: '60mb' },
  },
};

export default nextConfig;
