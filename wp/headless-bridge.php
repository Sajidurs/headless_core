<?php
/**
 * Plugin Name:  Headless Bridge
 * Description:  Everything WordPress needs to serve a Next.js frontend: redirects stray
 *               visitors, points the Preview button at Next.js draft mode, invalidates the
 *               frontend cache on save, and keeps the ACF content model in version control.
 * Version:      1.0.0
 * Author:        Project 01
 *
 * ---------------------------------------------------------------------------
 * INSTALL: upload to  wp-content/mu-plugins/headless-bridge.php
 *
 * "mu" means must-use. WordPress loads every PHP file in that folder
 * automatically and there is no way to deactivate it from wp-admin, which is
 * exactly what we want — a client cannot accidentally switch off the thing
 * that makes their website work.
 *
 * If wp-content/mu-plugins/ does not exist, create it.
 * ---------------------------------------------------------------------------
 */

// Fail safe. If the wp-config block has not been pasted yet, do nothing at all
// rather than throwing errors on every request.
if ( ! defined( 'HEADLESS_URL' ) ) {
	return;
}

/**
 * The public site's hostname, e.g. "dripbar.site".
 */
function hb_frontend_host() {
	return wp_parse_url( HEADLESS_URL, PHP_URL_HOST );
}

/**
 * Should stray visitors be bounced to the Next.js site?
 *
 * Only once Vercel actually owns the public domain. Before that, the redirect
 * creates an infinite loop, and the loop is not obvious:
 *
 *   visitor -> cms.dripbar.site/about
 *           -> this plugin redirects to dripbar.site/about
 *           -> but dripbar.site still resolves to THIS server, so WP serves it
 *           -> WP's own redirect_canonical sees WP_HOME is cms.dripbar.site
 *              and 301s back to cms.dripbar.site/about
 *           -> round and round
 *
 * Checking the incoming hostname does not catch that, because each individual
 * hop looks legitimate. PHP also cannot reliably detect where a domain's DNS
 * currently points. So this is an explicit switch rather than a guess.
 *
 * HOW TO USE IT
 *   During the build:  leave HEADLESS_LIVE undefined or false.
 *                      dripbar.site and cms.dripbar.site both serve WordPress.
 *                      Harmless — nobody is visiting the site yet.
 *   At DNS cutover:    add  define( 'HEADLESS_LIVE', true );  to wp-config.php
 *                      (Phase 14). From then on cms.* bounces visitors to Vercel.
 */
function hb_should_redirect_visitors() {
	if ( ! defined( 'HEADLESS_LIVE' ) || ! HEADLESS_LIVE ) {
		return false;
	}

	// Belt and braces. Even when live, never redirect a request that somehow
	// arrived on the public hostname — that is the loop condition.
	$incoming = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( $_SERVER['HTTP_HOST'] ) : '';

	return $incoming !== strtolower( (string) hb_frontend_host() );
}

/**
 * Permit redirects to the frontend host.
 *
 * wp_safe_redirect() runs the target through wp_validate_redirect(), which only
 * allows the site's own host and silently rewrites anything else to
 * /wp-admin/. Since the frontend is a DIFFERENT host, without this filter every
 * visitor to the CMS would be dumped at the login screen instead of the website.
 */
add_filter( 'allowed_redirect_hosts', function ( $hosts ) {
	$hosts[] = hb_frontend_host();

	return array_unique( array_filter( $hosts ) );
} );

/* ===========================================================================
 * 1. NOBODY SHOULD LAND ON THE WORDPRESS FRONTEND
 *
 * Old links, Google's index, and the client typing the wrong URL all end up at
 * cms.dripbar.site. Send them to the real site at the matching path.
 *
 * The three early returns matter:
 *   - REST/GraphQL requests must pass through, or the frontend gets a redirect
 *     instead of data and the whole site 500s.
 *   - Logged-in editors must pass through, so the Preview flow in section 2
 *     can hand off cleanly.
 *   - Feeds and robots.txt are handled separately.
 * ======================================================================== */
add_action( 'template_redirect', function () {

	if ( is_admin() || is_feed() || is_robots() || is_preview() ) {
		return;
	}

	// GraphQL and REST are how the frontend reads content. Never redirect them.
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return;
	}
	if ( defined( 'GRAPHQL_REQUEST' ) && GRAPHQL_REQUEST ) {
		return;
	}

	// Let editors browse the backend without being bounced out.
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) {
		return;
	}

	// Off until HEADLESS_LIVE is defined at DNS cutover. See the function above
	// for why this cannot be auto-detected.
	if ( ! hb_should_redirect_visitors() ) {
		return;
	}

	$path = isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '/';

	// 302 until launch is verified, so a mistake cannot get permanently cached
	// in visitors' browsers or an ISP proxy. Switch to 301 at Phase 16.
	wp_safe_redirect( HEADLESS_URL . $path, 302 );
	exit;
} );

/* ===========================================================================
 * 2. THE PREVIEW BUTTON
 *
 * By default "Preview" renders the draft through the WordPress theme, which is
 * not the website any more. We rewrite the link so it opens the Next.js draft
 * mode endpoint instead, carrying a signed secret and the page's relative path.
 *
 * Next.js validates the secret, flips on draft mode, and re-fetches the page
 * with authentication so unpublished content is visible.
 * ======================================================================== */
function hb_preview_url( $post ) {
	$uri = wp_make_link_relative( get_permalink( $post ) );

	return add_query_arg(
		array(
			'secret' => rawurlencode( PREVIEW_SECRET ),
			'uri'    => rawurlencode( $uri ),
		),
		HEADLESS_URL . '/api/preview'
	);
}

add_filter( 'preview_post_link', function ( $link, $post ) {
	return hb_preview_url( $post );
}, 10, 2 );

/* ===========================================================================
 * 3. CACHE INVALIDATION
 *
 * The frontend serves pre-rendered HTML from a CDN, so it has no idea the
 * client just changed something. This POSTs to Next.js and says "rebuild that
 * page now".
 *
 * 'blocking' => false is important: WordPress fires the request and moves on
 * without waiting. The editor never feels a delay, even if Vercel is slow.
 * ======================================================================== */
function hb_revalidate( $uri = null ) {

	wp_remote_post( HEADLESS_URL . '/api/revalidate', array(
		'timeout'  => 5,
		'blocking' => false,
		'headers'  => array(
			'Content-Type' => 'application/json',
			'x-wp-secret'  => REVALIDATE_SECRET,
		),
		'body'     => wp_json_encode( array( 'uri' => $uri ) ),
	) );
}

/**
 * Fires on publish, update, unpublish, and trash.
 *
 * The guard clauses skip the noise: autosaves, revisions, and WordPress's own
 * internal post types. Without them, a single save can fire five requests.
 */
add_action( 'transition_post_status', function ( $new_status, $old_status, $post ) {

	// Only care if the post is public now or was public before.
	if ( 'publish' !== $new_status && 'publish' !== $old_status ) {
		return;
	}

	if ( wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ) {
		return;
	}

	$ignored = array( 'revision', 'nav_menu_item', 'acf-field', 'acf-field-group', 'custom_css' );
	if ( in_array( $post->post_type, $ignored, true ) ) {
		return;
	}

	hb_revalidate( wp_make_link_relative( get_permalink( $post ) ) );
}, 10, 3 );

// Menus and ACF Options pages are global — they appear on every page, so flush
// everything rather than one URI. Passing null does exactly that.
add_action( 'wp_update_nav_menu', function () {
	hb_revalidate();
} );

add_action( 'acf/save_post', function ( $post_id ) {
	// ACF options pages pass a string id like 'options'. Real posts pass an int,
	// and those are already handled by transition_post_status above.
	if ( is_string( $post_id ) ) {
		hb_revalidate();
	}
}, 20 );

/* ===========================================================================
 * 4. ACF FIELD GROUPS AS FILES  ← the most valuable twelve lines in the project
 *
 * By default ACF stores field groups in the database. That means every new
 * client site starts with an empty page builder and you rebuild 200 fields by
 * hand.
 *
 * These two filters move the field groups into wp-content/mu-plugins/acf-json/
 * as .json files. Copy that folder into the next client's install and the
 * entire content model — every section, every field — appears in wp-admin
 * ready to use. It also means the content model lives in git alongside the
 * frontend code that consumes it.
 * ======================================================================== */
add_filter( 'acf/settings/save_json', function () {
	return __DIR__ . '/acf-json';
} );

add_filter( 'acf/settings/load_json', function ( $paths ) {
	// Replace rather than append, so only our version-controlled folder is used.
	return array( __DIR__ . '/acf-json' );
} );

/* ===========================================================================
 * 5. REGISTER CLASSIC MENU LOCATIONS
 *
 * twentytwentyfive is a block theme, and block themes do not register classic
 * menu locations — they use Navigation blocks instead. But WPGraphQL exposes
 * menus through those classic locations, so without this the PRIMARY enum does
 * not exist in the schema and the site settings query errors out.
 *
 * Registering them here rather than in a theme also means the locations survive
 * a theme switch, and travel with this file to the next client.
 *
 * After uploading this file: Appearance -> Menus, create a menu, and tick
 * "Primary navigation" under Display location.
 * ======================================================================== */
add_action( 'after_setup_theme', function () {
	register_nav_menus( array(
		'primary' => __( 'Primary navigation', 'headless' ),
		'footer'  => __( 'Footer navigation', 'headless' ),
	) );
} );

/* ===========================================================================
 * 6. KEEP THE CMS OUT OF GOOGLE
 *
 * If cms.dripbar.site gets indexed you are competing with your own client site
 * and splitting its authority. Section 1 redirects human visitors, but crawlers
 * hitting /graphql or an asset URL never reach that hook — so send the header
 * unconditionally.
 * ======================================================================== */
add_action( 'send_headers', function () {
	header( 'X-Robots-Tag: noindex, nofollow', true );
} );

/* ===========================================================================
 * 7. TIDY THE ADMIN
 *
 * Small quality-of-life items. None of these are load-bearing.
 * ======================================================================== */

// Disable XML-RPC. Nothing in this stack uses it; bots hammer it constantly.
add_filter( 'xmlrpc_enabled', '__return_false' );

// Remove the WordPress version from any remaining output.
remove_action( 'wp_head', 'wp_generator' );

// Tell the client where their website actually is.
add_action( 'admin_notices', function () {
	printf(
		'<div class="notice notice-info"><p><strong>Headless site.</strong> ' .
		'This is the content editor. The public website is at <a href="%1$s" target="_blank" rel="noopener">%1$s</a>. ' .
		'Changes go live within a few seconds of clicking Update.</p></div>',
		esc_url( HEADLESS_URL )
	);
} );
