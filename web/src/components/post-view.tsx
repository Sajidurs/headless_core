import Image from "next/image";

import type { PostNode } from "@/lib/types";

/**
 * Blog post template.
 *
 * Post bodies come from the block editor as an HTML blob, so Tailwind classes
 * cannot reach inside them. `prose` from @tailwindcss/typography styles that
 * blob from the outside — headings, lists, links, blockquotes. Tuning the prose
 * scale to match the brand is part of the Phase 10 design pass.
 */
export default function PostView({ post }: { post: PostNode }) {
  const image = post.featuredImage?.node;
  const published = post.date ? new Date(post.date) : null;

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <header>
        {post.categories?.nodes.length ? (
          <p className="text-muted font-mono text-xs tracking-widest uppercase">
            {post.categories.nodes.map((category) => category.name).join(" · ")}
          </p>
        ) : null}

        <h1 className="text-ink font-display mt-3 text-4xl font-bold tracking-tight text-balance">
          {post.title}
        </h1>

        <p className="text-muted mt-4 text-sm">
          {published ? (
            <time dateTime={published.toISOString()}>
              {published.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          ) : null}
          {post.author?.node?.name ? <> · {post.author.node.name}</> : null}
        </p>
      </header>

      {image?.sourceUrl ? (
        <Image
          src={image.sourceUrl}
          alt={image.altText ?? ""}
          width={image.mediaDetails?.width ?? 1200}
          height={image.mediaDetails?.height ?? 675}
          // The featured image is the largest thing above the fold on a post,
          // so it is the Largest Contentful Paint element. `priority` tells
          // Next.js to preload it instead of lazy-loading.
          priority
          className="mt-10 w-full rounded-sm object-cover"
        />
      ) : null}

      {post.content ? (
        <div
          className="prose prose-neutral mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : null}
    </article>
  );
}
