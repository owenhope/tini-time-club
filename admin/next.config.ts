import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.tinitimeclub.com" }],
        destination: "https://tinitimeclub.com/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
  },
};

// BotID's challenge script and verdict proxy are served through rewrites
// this wrapper adds. Without them checkBotId() fails closed in production,
// and every protected form (business, claim, admin login) is refused.
export default withBotId(nextConfig);
