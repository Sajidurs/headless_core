/**
 * Every GraphQL query in the app.
 *
 * STAGING NOTE — read this before adding anything.
 *
 * These queries only use WordPress core fields, so they work with WPGraphQL
 * alone. No ACF, no Yoast. That is deliberate: it lets us prove the entire
 * pipeline (WordPress -> GraphQL -> Next.js -> Vercel -> live HTML) before
 * either paid plugin is in place.
 *
 * Two things get added later, each marked with the phase that adds it:
 *   Phase 09/10 — ACF `pageBuilder { sections { ... } }` fragments
 *   Phase 12    — Yoast `seo { ... }` fields
 *
 * Adding an ACF section means adding its inline fragment to NODE_BY_URI.
 * Forgetting that step is the classic bug in this architecture: the section
 * renders blank because the data was never requested.
 */

/**
 * The query that powers the whole site.
 *
 * `nodeByUri` is WPGraphQL's universal resolver: hand it any path and it
 * returns whatever WordPress thinks lives there — a page, a post, a category
 * archive, a custom post type. This is why the app needs exactly one route.
 *
 * The `... on Type` blocks are inline fragments. GraphQL returns only the
 * block matching the actual type, and `__typename` tells us which one we got.
 */
export const NODE_BY_URI = /* GraphQL */ `
  query NodeByUri($uri: String!) {
    nodeByUri(uri: $uri) {
      __typename

      ... on DatabaseIdentifier {
        databaseId
      }

      ... on NodeWithTitle {
        title
      }

      ... on Page {
        uri
        content
        modifiedGmt
        # Phase 09/10 adds pageBuilder { sections { ... } } here.
        # Phase 12 adds seo { ... } here.
      }

      ... on Post {
        uri
        content
        date
        modifiedGmt
        excerpt
        author {
          node {
            name
          }
        }
        categories(first: 5) {
          nodes {
            name
            uri
          }
        }
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
      }
    }
  }
`;

/**
 * Every published URL, used by `generateStaticParams` to pre-render the whole
 * site at build time.
 *
 * `contentNodes` spans every public post type, so new custom post types are
 * picked up without touching this query.
 */
export const ALL_URIS = /* GraphQL */ `
  query AllUris {
    contentNodes(first: 500, where: { status: PUBLISH }) {
      nodes {
        uri
      }
    }
  }
`;

/**
 * Site-wide data for the header and footer. Fetched once per page render and
 * deduplicated by Next.js, so it costs nothing extra.
 *
 * Menu locations come from `register_nav_menus()` in headless-bridge.php.
 * Block themes like twentytwentyfive do not register classic menu locations,
 * which is why the bridge plugin has to do it — without that, PRIMARY does not
 * exist in the schema and this query errors.
 */
export const SITE_SETTINGS = /* GraphQL */ `
  query SiteSettings {
    generalSettings {
      title
      description
    }
    primaryMenu: menuItems(where: { location: PRIMARY }, first: 30) {
      nodes {
        id
        label
        uri
        parentId
      }
    }
    footerMenu: menuItems(where: { location: FOOTER }, first: 30) {
      nodes {
        id
        label
        uri
      }
    }
  }
`;

/** URIs plus modified dates, for app/sitemap.ts. */
export const SITEMAP = /* GraphQL */ `
  query Sitemap {
    contentNodes(first: 1000, where: { status: PUBLISH }) {
      nodes {
        uri
        modifiedGmt
      }
    }
  }
`;
