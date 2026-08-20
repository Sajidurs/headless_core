import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/**
 * Draft preview entry point.
 *
 * The Preview button in WordPress links here (see section 2 of
 * headless-bridge.php). We check the shared secret, switch on Next.js draft
 * mode, and redirect to the real page URL.
 *
 * Draft mode sets a signed cookie. On the next render, `draftMode().isEnabled`
 * is true, so the page fetches from WordPress with authentication and without
 * caching — showing unpublished content to this one browser only.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const uri = searchParams.get("uri");

  if (secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview token", { status: 401 });
  }

  // Only ever redirect to a path on this site. Without this check the endpoint
  // is an open redirect: anyone with the secret could send visitors anywhere.
  if (!uri || !uri.startsWith("/") || uri.startsWith("//")) {
    return new Response("Invalid preview target", { status: 400 });
  }

  (await draftMode()).enable();

  // `redirect` throws internally — that is how it works in the App Router, so
  // it must not sit inside a try/catch.
  redirect(uri);
}
