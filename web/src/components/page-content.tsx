import type { PageNode } from "@/lib/types";

/**
 * Temporary fallback template, used until the ACF page builder exists.
 *
 * Renders whatever the client typed into the block editor as raw HTML. It is
 * deliberately plain: the point right now is to prove that content travels from
 * WordPress to the live site, not to look designed.
 *
 * Once Phase 09/10 lands, pages render through the section registry and this
 * component only handles legal pages — privacy, terms — where a single block of
 * prose genuinely is the right shape.
 *
 * `dangerouslySetInnerHTML` is correct here. The HTML comes from an
 * authenticated WordPress editor, not from user input; sanitising it would
 * strip legitimate formatting.
 */
export default function PageContent({ page }: { page: PageNode }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-ink font-display text-4xl font-bold tracking-tight text-balance">
        {page.title}
      </h1>

      {page.content ? (
        <div
          className="prose prose-neutral mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <p className="text-muted mt-8">
          This page has no content yet. Add some in WordPress and it will appear here.
        </p>
      )}
    </article>
  );
}
