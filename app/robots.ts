import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/resume-review/", "/web-api/resume-links/"],
    },
    sitemap: "https://bojian.kelance.cn/sitemap.xml",
  };
}
