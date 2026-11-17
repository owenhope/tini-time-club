import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};

// BotID's challenge script and verdict proxy are served through rewrites
// this wrapper adds. Without them checkBotId() fails closed in production,
// and every protected form (business, claim, admin login) is refused.
export default withBotId(nextConfig);
