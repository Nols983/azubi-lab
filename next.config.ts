import type { NextConfig } from "next";
import { getApplicationSecurityHeaders } from "./src/app/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    useTypeScriptCli: false,
    serverActions: {
      bodySizeLimit: "27mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getApplicationSecurityHeaders(process.env.NODE_ENV === "production"),
      },
      {
        source: "/passwort-zuruecksetzen",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
