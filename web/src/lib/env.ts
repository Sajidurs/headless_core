/**
 * Required environment variables, read through one place.
 *
 * WHY THESE THROW INSTEAD OF FALLING BACK TO A DEFAULT
 *
 * These values end up in canonical tags, Open Graph URLs, and the sitemap. A
 * hardcoded fallback domain is therefore worse than a failed build: if the env
 * var is ever missing in Vercel, the site would quietly publish canonicals and
 * a sitemap pointing at a *different client's* domain. That is an SEO problem
 * you would not notice for weeks.
 *
 * A build that fails with a clear message is strictly better. So: no fallbacks,
 * and no client domain anywhere in committed source. Real values live only in
 * `web/.env.local` (gitignored) and the Vercel project settings.
 */

function missing(name: string): never {
	throw new Error(
		`Missing required environment variable ${name}.\n` +
			`Local: copy web/.env.local.example to web/.env.local and fill it in.\n` +
			`Deployed: set it in Vercel -> Project Settings -> Environment Variables ` +
			`(both Production and Preview).`,
	);
}

/**
 * The public site origin, e.g. "https://example.com". Never a trailing slash,
 * so callers can safely concatenate a URI that starts with one.
 *
 * Note the literal `process.env.NEXT_PUBLIC_SITE_URL` access. `NEXT_PUBLIC_`
 * variables are inlined into the bundle at build time by static analysis, so a
 * dynamic lookup like `process.env[name]` would NOT be replaced and would come
 * back undefined in a client component. Keep it literal.
 */
export function siteUrl(): string {
	const value = process.env.NEXT_PUBLIC_SITE_URL;

	if (!value) missing("NEXT_PUBLIC_SITE_URL");

	return value.replace(/\/+$/, "");
}

/**
 * The WPGraphQL endpoint, e.g. "https://cms.example.com/graphql".
 * Server-side only — never exposed to the browser.
 */
export function graphqlUrl(): string {
	const value = process.env.WP_GRAPHQL_URL;

	if (!value) missing("WP_GRAPHQL_URL");

	return value;
}
