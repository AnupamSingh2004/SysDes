import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployment
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
