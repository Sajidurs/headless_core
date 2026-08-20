/**
 * Shapes returned by the GraphQL queries in queries.ts.
 *
 * Hand-written for now. Once the ACF section library exists (Phase 09/10) it is
 * worth generating these from the live schema with GraphQL Code Generator —
 * then a renamed ACF field becomes a compile error instead of a blank section
 * on the live site. Until the schema is stable, generated types churn more than
 * they help.
 */

export type WpImage = {
  sourceUrl: string;
  altText: string | null;
  mediaDetails: { width: number | null; height: number | null } | null;
};

export type MediaNode = { node: WpImage | null } | null;

/** Anything ACF Flexible Content returns. Narrowed per component. */
export type Section = { __typename: string } & Record<string, unknown>;

export type PageNode = {
  __typename: "Page";
  databaseId: number;
  title: string | null;
  uri: string | null;
  content: string | null;
  modifiedGmt: string | null;
  /** Present only once the ACF page builder is wired up (Phase 09). */
  pageBuilder?: { sections: Section[] | null } | null;
  seo?: SeoFields | null;
};

export type PostNode = {
  __typename: "Post";
  databaseId: number;
  title: string | null;
  uri: string | null;
  content: string | null;
  date: string | null;
  modifiedGmt: string | null;
  excerpt: string | null;
  author: { node: { name: string | null } | null } | null;
  categories: { nodes: { name: string; uri: string }[] } | null;
  featuredImage: MediaNode;
  seo?: SeoFields | null;
};

/** Added in Phase 12 with Yoast + WPGraphQL SEO. */
export type SeoFields = {
  title: string | null;
  metaDesc: string | null;
  canonical: string | null;
  metaRobotsNoindex: string | null;
  opengraphTitle: string | null;
  opengraphImage: { sourceUrl: string } | null;
};

/** Any other type nodeByUri can return — categories, archives, CPTs. */
export type UnknownNode = { __typename: string; title?: string | null };

export type WpNode = PageNode | PostNode | UnknownNode;

export type NodeByUriResult = { nodeByUri: WpNode | null };

export type AllUrisResult = { contentNodes: { nodes: { uri: string | null }[] } };

export type SitemapResult = {
  contentNodes: { nodes: { uri: string | null; modifiedGmt: string | null }[] };
};

export type MenuItem = {
  id: string;
  label: string | null;
  uri: string | null;
  parentId?: string | null;
};

export type SiteSettingsResult = {
  generalSettings: { title: string | null; description: string | null };
  primaryMenu: { nodes: MenuItem[] } | null;
  footerMenu: { nodes: MenuItem[] } | null;
};
