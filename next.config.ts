import type { NextConfig } from "next";

const nextConfig: NextConfig = {
reactStrictMode: true,
  output: 'standalone', // 建議用於生產環境部署
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
        // 應用於所有上傳路徑
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // 設置 24 小時的快取
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // 解決某些 Node.js 模塊的相容性問題
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
