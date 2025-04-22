import type { NextConfig } from "next";


console.log("環境變數檢查：");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USERNAME:", process.env.DB_USERNAME);
console.log("NODE_ENV:", process.env.NODE_ENV);
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 更新到最新的配置方式
  serverExternalPackages: ['puppeteer-core', 'puppeteer'],

  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },


  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-file/:path*',
      }
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

  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
  
    if (isServer) {
      const TerserPlugin = require("terser-webpack-plugin");
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true, // ✅ 保留 TypeORM Entity 類別名稱，避免 build 後查不到
          },
        }),
      ];
    }
  
    return config;
  }
};

export default nextConfig;
