import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { uriTag } from "@/lib/wp";

/**
 * Cache invalidation webhook.
 *
 * WordPress POSTs here every time content changes (see section 3 of
 * headless-bridge.php). We purge the cache tags for the affected page, so the
 * next visitor triggers a fresh fetch and gets updated HTML — usually within a
 * second or two.
 *
 * This endpoint is why the site can be fully static and still feel live. Get it
 * wrong and the client reports "I updated it and nothing happened" forever.
 *
 * NOTE ON THE NEXT 16 API
 * `revalidateTag` takes a required second argument in Next 16: a cacheLife
 * profile name, or a { expire } object. "max" is the documented value for a
 * plain purge from a route handler. In Next 15 this was a single-argument call.
 * `updateTag()` is the newer sibling, but it only works inside Server Actions.
 */
export async function POST(req: NextRequest) {
  // Constant-time comparison is overkill here — the secret is 32 random bytes
  // and this endpoint is not rate-limited by anything an attacker controls.
  if (req.headers.get("x-wp-secret") !== process.env.REVALIDATE_SECRET) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let uri: string | null = null;

  try {
    const body = (await req.json()) as { uri?: string | null };
    uri = typeof body.uri === "string" ? body.uri : null;
  } catch {
    // A body-less ping is valid: it means "flush everything".
  }

  // Global tag. Covers menus, site settings, and any listing that includes the
  // changed post — a new blog post has to appear in /blog/ as well as at its
  // own URL.
  revalidateTag("wp", "max");

  // Targeted tag, so the changed page rebuilds immediately rather than waiting
  // for a visitor to happen upon it.
  if (uri) {
    revalidateTag(uriTag(uri), "max");
  }

  return Response.json({ ok: true, revalidated: ["wp", uri && uriTag(uri)].filter(Boolean) });
}

/**
 * GET is a health check, so you can confirm the route is deployed and the
 * secret matches without having to save a post in WordPress.
 *
 *   curl -H "x-wp-secret: <secret>" https://example.com/api/revalidate
 */
export async function GET(req: NextRequest) {
  const authorised = req.headers.get("x-wp-secret") === process.env.REVALIDATE_SECRET;

  return Response.json({
    ok: true,
    secretConfigured: Boolean(process.env.REVALIDATE_SECRET),
    secretMatches: authorised,
  });
}
