import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";
import { SEO_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Backend-as-a-Service Marketplace`,
    short_name: SITE_NAME,
    description: SEO_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#070312",
    theme_color: "#070312",
    categories: ["technology", "business"],
    icons: [
      {
        src: "/icon.png",
        sizes: "178x124",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "178x124",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
