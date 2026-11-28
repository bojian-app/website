import type { NextConfig } from "next";
const privatePage = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "private, no-store" },
];
const config: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async headers() {
    return [
      { source: "/resume-review/:path*", headers: privatePage },
      { source: "/resume/:path*", headers: privatePage },
    ];
  },
  // In production the reverse proxy sends /api to the API itself.
  async rewrites() {
    const api = process.env.BOJIAN_APP_AUTH_ORIGIN;
    return process.env.NODE_ENV === "development" && api
      ? [
          {
            source: "/api/v1/public/resume-shares/:path*",
            destination: `${api}/api/v1/public/resume-shares/:path*`,
          },
        ]
      : [];
  },
};
export default config;
