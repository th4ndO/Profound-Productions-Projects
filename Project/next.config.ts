import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sign-in was removed (each browser now gets an anonymous account via
  // /start). Old tabs, bookmarks and email links still point at these
  // paths, which would otherwise 404 once the visitor has a session.
  async redirects() {
    return [
      { source: "/sign-in", destination: "/", permanent: false },
      { source: "/auth/callback", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
