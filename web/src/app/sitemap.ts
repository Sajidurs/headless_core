import type { MetadataRoute } from "next";

import { wpQuery } from "@/lib/wp";
import { SITEMAP } from "@/lib/queries";
import type { SitemapResult } from "@/lib/types";

/**
 * The sitemap is generated here, not by Yoast.
 *
 * Yoast still runs on the WordPress side and still writes page metadata, but
 * its sitemap lists cms.dripbar.site URLs. Submitting that to Google would
 * index the backend and split the client's search authority across two
 * hostnames. So we build the sitemap from the same GraphQL data, with the
 * public hostname.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dripbar.site").replace(/\/$/, "");

  try {
    const data = await wpQuery<SitemapResult>(SITEMAP, {}, { tags: ["wp"] });

    return data.contentNodes.nodes
      .filter((node) => node.uri && !node.uri.startsWith("/wp-"))
      .map((node) => ({
        url: `${base}${node.uri}`,
        // WPGraphQL returns GMT without a timezone marker, so append Z or the
        // date is parsed as local time and drifts.
        lastModified: node.modifiedGmt ? new Date(`${node.modifiedGmt}Z`) : undefined,
        changeFrequency: "weekly" as const,
        priority: node.uri === "/" ? 1 : 0.7,
      }));
  } catch (error) {
    // A sitemap that 500s is worse than a minimal one — Search Console reports
    // it as an error and stops retrying for a while.
    console.warn("sitemap: could not reach WordPress —", error);
    return [{ url: base, changeFrequency: "weekly", priority: 1 }];
  }
}
