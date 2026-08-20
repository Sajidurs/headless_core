import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/**
 * Leaves draft mode and returns to the published site.
 *
 * The preview banner links here. Without it, an editor who previews a draft
 * keeps seeing draft content on every page until the cookie expires, then
 * reports the live site is "showing the wrong thing".
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const back = searchParams.get("uri");

  (await draftMode()).disable();

  redirect(back && back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
