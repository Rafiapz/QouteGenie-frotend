import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/workspace",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
