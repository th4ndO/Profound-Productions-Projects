import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest. Lets phones install
 * Groundwork to the home screen — and on iOS, Web Push only works for an
 * installed (home screen) web app, so reminders depend on this.
 *
 * Must stay excluded from the auth middleware (see src/proxy.ts):
 * browsers fetch the manifest without cookies, so it would otherwise be
 * redirected to /start for every visitor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Groundwork",
    short_name: "Groundwork",
    description: "A personal milestone tracker.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#edf1f4",
    theme_color: "#3b4cca",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The icon is a full-bleed fill, so it's safe to crop as maskable.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
