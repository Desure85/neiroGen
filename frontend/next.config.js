/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://app:8000/api/:path*',
      },
      {
        source: '/sanctum/:path*',
        destination: 'http://app:8000/sanctum/:path*',
      },
    ]
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      canvas: false,
    }
    return config
  },
}

module.exports = nextConfig
