import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @node-rs/argon2 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
