import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  outputFileTracingIncludes: { "/**/*": ["./drizzle/**/*"] },
  images: { unoptimized: true },
};

export default nextConfig;
