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
}

module.exports = nextConfig
