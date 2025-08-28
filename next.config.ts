import type { NextConfig } from "next";
// @ts-ignore
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore for Vercel deployment - warnings shouldn't block deployment
  },
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checks enabled
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
