import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeuroCalm — Migraine OS",
    short_name: "NeuroCalm",
    description:
      "Photophobia-safe, offline-first migraine tracker with voice logging, threshold AI, and clinical PDF reports.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Quick Attack Log",
        short_name: "Attack",
        url: "/?quick=attack",
      },
      {
        name: "Voice Log",
        short_name: "Voice",
        url: "/?quick=voice",
      },
    ],
  };
}
