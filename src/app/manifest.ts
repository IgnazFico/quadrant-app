import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quadrant — Life Architecture",
    short_name: "Quadrant",
    description:
      "Anti-burnout role-based life architecture and a yearly constellation of the months you showed up.",
    start_url: "/goals",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF9F2",
    theme_color: "#FFF9F2",
    icons: [
      { src: "/brand/editorial/png/quadrant-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/editorial/png/quadrant-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/editorial/png/quadrant-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/editorial/png/quadrant-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/brand/editorial/svg/quadrant-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
