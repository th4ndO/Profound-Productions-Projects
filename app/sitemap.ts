import type { MetadataRoute } from "next";

const BASE_URL = "https://profound-productions.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: BASE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/portfolio`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
