import type { NextConfig } from "next";

import redirects from "./redirects.json";

/**
 * The CMS hostname is derived from the GraphQL URL rather than hardcoded, so a
 * new client only ever needs the env var changed — never this file.
 *
 * No fallback domain on purpose. A wrong hostname here would silently disable
 * image optimisation for every upload, so failing the build with a clear
 * message is better. See src/lib/env.ts for the same reasoning applied to the
 * public site URL.
 */
if (!process.env.WP_GRAPHQL_URL) {
  throw new Error(
    "Missing required environment variable WP_GRAPHQL_URL.\n" +
      "Local: copy web/.env.local.example to web/.env.local and fill it in.\n" +
      "Deployed: set it in Vercel -> Project Settings -> Environment Variables.",
  );
}

const cmsHost = new URL(process.env.WP_GRAPHQL_URL).hostname;

const config: NextConfig = {
  images: {
    /**
     * next/image refuses to optimise a remote image unless its host is listed
     * here — otherwise the endpoint would be an open image proxy anyone could
     * abuse. Scoped to the uploads directory specifically.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: cmsHost,
        pathname: "/wp-content/uploads/**",
      },
    ],
    /**
     * Every extra quality and size multiplies the number of optimised variants
     * Vercel bills for. Two qualities and a trimmed size list keeps that cost
     * predictable without any visible difference (blocker B-07 in the playbook).
     */
    qualities: [70, 85],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    formats: ["image/webp"],
  },

  /**
   * A headless site loses WordPress redirect plugins entirely — nothing in
   * WordPress runs on a public request any more. Client legacy URLs go in
   * redirects.json so an exported list can be pasted straight in.
   */
  redirects: async () => redirects,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Fail the build on a type error rather than shipping a broken page. This is
  // the default; stated explicitly so nobody "fixes" a build by disabling it.
  //
  // Note: Next 16 removed the `eslint` key from next.config — linting is no
  // longer part of `next build`. Run `pnpm lint` separately (and in CI).
  typescript: { ignoreBuildErrors: false },
};

export default config;
