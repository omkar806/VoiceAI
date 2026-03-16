/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['rc-util', 'antd', '@ant-design/icons', '@ant-design/icons-svg', 'rc-pagination', 'rc-picker'],
  images: {
    domains: ['uttertuple.com', 'dev.uttertuple.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    config.cache = true;
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

module.exports = nextConfig 