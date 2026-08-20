import type { NextConfig } from "next";

import redirects from "./redirects.json";

/**
 * The CMS hostname is derived from the GraphQL URL rather than hardcoded, so a
 * new client only ever needs the env var changed — never this file.
 */
const cmsHost = new URL(
  process.env.WP_GRAPHQL_URL ?? "https://cms.dripbar.site/graphql",
).hostname;

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
