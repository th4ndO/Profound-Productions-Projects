import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Magic-link sign-in was removed; old email links still point at the
  // callback, which would otherwise 404. (/sign-in is a real page again:
  // email + password accounts.)
  async redirects() {
    return [
      { source: "/auth/callback", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
