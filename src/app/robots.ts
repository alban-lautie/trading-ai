import type { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Application routes are user-private and must not be indexed.
      disallow: ["/dashboard", "/positions", "/alerts", "/ai", "/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
