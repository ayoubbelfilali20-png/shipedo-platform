const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
}

module.exports = nextConfig
