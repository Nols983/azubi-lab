import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Azubi Lab",
    short_name: "Azubi Lab",
    description: "Interaktive Lernplattform für Fachinformatiker Systemintegration.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#172554",
    lang: "de",
    categories: ["education"],
    icons: [
      {
        src: "/icons/azubi-lab-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/azubi-lab-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/azubi-lab-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
