import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quadrant — Life Architecture",
    short_name: "Quadrant",
    description:
      "Anti-burnout role-based life architecture and cumulative annual growth rings.",
    start_url: "/goals",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF9F2",
    theme_color: "#FFF9F2",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
