import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Ignorar erros de ESLint durante build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros de TypeScript durante build (apenas para teste)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
