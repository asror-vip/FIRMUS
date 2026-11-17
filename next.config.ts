import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paycom.uz https://my.click.uz",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
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
