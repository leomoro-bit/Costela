import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload da logo (até 1 MB) passa por Server Action: o padrão do Next é 1 MB no total.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
