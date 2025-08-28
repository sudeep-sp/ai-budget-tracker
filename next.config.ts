import type { NextConfig } from "next";
// @ts-ignore
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // We fixed the critical errors, warnings are acceptable
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
