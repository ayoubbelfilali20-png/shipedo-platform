const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  turbopack: {
    root: path.join(__dirname),
  },
}

module.exports = nextConfig
