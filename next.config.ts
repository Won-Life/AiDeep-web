import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN;
const API_BASE_PATH = process.env.API_BASE_PATH;

if (!API_ORIGIN) {
  throw new Error("API_ORIGIN is not set");
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}${API_BASE_PATH ?? ""}/:path*`,
      },
    ];
  },
};

export default nextConfig;
