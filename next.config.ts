import type { NextConfig } from "next";

const dockerBuild = process.env.SKIP_TYPECHECK === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: dockerBuild,
  },
  eslint: {
    ignoreDuringBuilds: dockerBuild,
  },
};

export default nextConfig;
