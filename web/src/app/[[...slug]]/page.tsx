import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { wpQuery, toUri, uriTag } from "@/lib/wp";
import { NODE_BY_URI, ALL_URIS } from "@/lib/queries";
import type { NodeByUriResult, AllUrisResult, PageNode, PostNode } from "@/lib/types";
import Sections from "@/components/sections";
import PostView from "@/components/post-view";
import PageContent from "@/components/page-content";

/**
 * ONE ROUTE RENDERS THE ENTIRE SITE.
 *
 * `[[...slug]]` is an *optional* catch-all: the double brackets mean it also
 * matches "/" with no segments at all. So this single file handles the
 * homepage, every page, every blog post, and every custom post type.
 *
 * The trick that makes it possible is WPGraphQL's `nodeByUri`. Hand it a path
 * and it returns whatever WordPress thinks lives there. We then look at
 * `__typename` to decide which component tree to render.
 *
 * Practical consequence: you will almost never add another route to this app.
 * New page types become new ACF layouts and new section components instead.
 */

// Fallback safety net. The WordPress webhook (/api/revalidate) is what actually
// keeps content fresh; this just guarantees nothing can go stale for more than
// an hour if that webhook ever fails silently.
export const revalidate = 3600;

// A URL that is not in generateStaticParams still gets rendered on first
// request, then cached. Set to false if you would rather unknown URLs 404
// immediately without hitting WordPress.
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug?: string[] }> };

/**
 * Fetch once, reuse. Next.js dedupes identical fetches within a single render
 * pass, so generateMetadata and the component below share one network request
 * rather than making two.
 */
async function getNode(slug: string[] | undefined, preview: boolean) {
  const uri = toUri(slug);

  const data = await wpQuery<NodeByUriResult>(
    NODE_BY_URI,
    { uri },
    { tags: ["wp", uriTag(uri)], preview },
  );

  return data.nodeByUri;
}

/**
 * Pre-render every published URL at build time.
 *
 * This is what turns the site into static HTML on a CDN. Without it, the first
 * visitor to each page waits for a round trip to WordPress.
 */
export async function generateStaticParams() {
  try {
    const data = await wpQuery<AllUrisResult>(ALL_URIS, {}, { tags: ["wp"] });

    return data.contentNodes.nodes
      .map((node) => node.uri)
      .filter((uri): uri is string => Boolean(uri) && !uri!.startsWith("/wp-"))
      .map((uri) => ({ slug: uri.split("/").filter(Boolean) }));
  } catch (error) {
    // Do not let an unreachable CMS break the build. Pages still render
    // on demand; they just are not pre-generated.
    console.warn("generateStaticParams: could not reach WordPress —", error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const node = await getNode(slug, false);

  if (!node) return { title: "Not found" };

  const seo = "seo" in node ? node.seo : null;
  const fallbackTitle = node.title ?? undefined;

  // Phase 12 populates `seo` via Yoast + WPGraphQL SEO. Until then we fall back
  // to the post title, which is correct if unremarkable.
  if (!seo) return { title: fallbackTitle };

  return {
    title: seo.title ?? fallbackTitle,
    description: seo.metaDesc ?? undefined,
    alternates: seo.canonical ? { canonical: seo.canonical } : undefined,
    robots: { index: seo.metaRobotsNoindex !== "noindex", follow: true },
    openGraph: {
      title: seo.opengraphTitle ?? seo.title ?? fallbackTitle,
      description: seo.metaDesc ?? undefined,
      images: seo.opengraphImage?.sourceUrl ? [seo.opengraphImage.sourceUrl] : undefined,
    },
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();

  const node = await getNode(slug, isPreview);

  if (!node) notFound();

  switch (node.__typename) {
    case "Page": {
      const page = node as PageNode;
      const sections = page.pageBuilder?.sections;

      // Once the ACF page builder exists (Phase 09) every page renders through
      // the section registry. Until then, fall back to the Gutenberg content so
      // the pipeline is testable today with nothing but WPGraphQL installed.
      return sections?.length ? (
        <Sections sections={sections} />
      ) : (
        <PageContent page={page} />
      );
    }

    case "Post":
      return <PostView post={node as PostNode} />;

    default:
      // Categories, tags, and author archives land here. Each gets a real
      // template when the client actually needs one.
      notFound();
  }
}
