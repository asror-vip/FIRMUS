import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/scanner",
        destination: "/assistant?tab=scan",
        permanent: false,
      },
      {
        source: "/calculator",
        destination: "/assistant?tab=calc",
        permanent: false,
      },
      {
        source: "/contracts",
        destination: "/assistant?tab=contract",
        permanent: false,
      },
      {
        source: "/history",
        destination: "/assistant?tab=history",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
