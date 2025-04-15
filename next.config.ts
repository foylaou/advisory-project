import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 更新到最新的配置方式
  serverExternalPackages: ['puppeteer-core', 'puppeteer'],

  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },

  output: 'standalone', // 適合生產環境部署

  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-file/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // 24小時快取
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    // 處理 Node.js 模塊相容性問題
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

export default nextConfig;
