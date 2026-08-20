/**
 * The only place in the app that talks to WordPress.
 *
 * Deliberately plain `fetch` rather than a GraphQL client library. We need
 * precise control over Next.js cache tags, and every abstraction layer makes
 * that harder to reason about. There is no runtime dependency here at all.
 */

const ENDPOINT = process.env.WP_GRAPHQL_URL;

type QueryOptions = {
  /**
   * Cache tags attached to this request. Calling `revalidateTag(tag)` later
   * invalidates every cached response carrying that tag. This is the mechanism
   * that lets a WordPress save update the live site in seconds.
   */
  tags?: string[];
  /**
   * Draft preview. Authenticates as a WordPress user so unpublished content is
   * returned, and skips the cache entirely — a preview must never be shared
   * between viewers or persisted.
   */
  preview?: boolean;
};

type GraphQLError = { message: string };

export async function wpQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  { tags = ["wp"], preview = false }: QueryOptions = {},
): Promise<T> {
  if (!ENDPOINT) {
    throw new Error("WP_GRAPHQL_URL is not set. Check web/.env.local");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (preview) {
    // WordPress Application Password over HTTP Basic. Server-side only —
    // these env vars have no NEXT_PUBLIC_ prefix so they never reach the browser.
    const user = process.env.WP_APP_USER;
    const pass = process.env.WP_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error("Preview requested but WP_APP_USER / WP_APP_PASSWORD are not set");
    }

    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    // Next.js does not cache fetch by default. Opting in here is the single
    // reason this site serves static HTML instead of hitting WordPress per
    // request. Without `force-cache` every visitor waits on PHP.
    cache: preview ? "no-store" : "force-cache",
    next: preview ? undefined : { tags },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WPGraphQL responded ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as { data?: T; errors?: GraphQLError[] };

  // GraphQL returns HTTP 200 even when the query is wrong, so this check is
  // not optional. A typo'd field name shows up here and nowhere else.
  if (json.errors?.length) {
    throw new Error(
      `WPGraphQL query failed: ${json.errors.map((e) => e.message).join(" | ")}`,
    );
  }

  if (!json.data) {
    throw new Error("WPGraphQL returned no data");
  }

  return json.data;
}

/**
 * Turn Next.js route segments into a WordPress URI.
 *
 * WordPress URIs carry a trailing slash and `nodeByUri` is strict about it:
 * "/about" returns null where "/about/" resolves. The homepage is bare "/".
 *
 *   undefined        -> "/"
 *   ["about"]        -> "/about/"
 *   ["services","x"] -> "/services/x/"
 */
export function toUri(slug?: string[]): string {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}/`;
}

/** Cache tag for one specific page, so a save only rebuilds what changed. */
export function uriTag(uri: string): string {
  return `uri:${uri}`;
}
