/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.R2_PUBLIC_HOSTNAME || '**.r2.dev',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
