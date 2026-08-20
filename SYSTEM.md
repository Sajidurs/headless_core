# SYSTEM.md — Project 01: Cleaning Service Site

> **Live status board.** This file answers one question: *where does the project stand right now?*
> Update the status columns and blocker rows in place as things change.
>
> For **history, context, and the reasoning behind every decision**, read `changeslog.md` — that
> is the file to hand a new assistant that is picking the project up cold. Keep the boundary
> clean: status here, story there. Do not duplicate.

---

## 1. Project facts

| | |
|---|---|
| **Project** | 01 — Cleaning service company *(client name TBC)* |
| **Doubles as** | The reusable kit. See §3 Strategy. |
| **Started** | 2026-08-20 |
| **Target ship** | TBC |
| **Public site** | `https://dripbar.site` → Vercel |
| **WordPress** | `https://cms.dripbar.site` → LiteSpeed shared host `103.159.36.86` |
| **GraphQL** | `https://cms.dripbar.site/graphql` |
| **Repo** | `https://github.com/Sajidurs/headless_core` · branch `main` · pushed 2026-08-20 |
| **cPanel user** | `myaimgenius` |
| **Document root** | `/home/myaimgenius/dripbar.site` — **not** `public_html` (verified from cPanel 2026-08-20) |
| **wp-config.php** | `/home/myaimgenius/dripbar.site/wp-config.php` |
| **mu-plugins** | `/home/myaimgenius/dripbar.site/wp-content/mu-plugins/` |
| **ACF JSON** | `/home/myaimgenius/dripbar.site/wp-content/mu-plugins/acf-json/` |
| **Repo** | `web/` = frontend · `wp/` = backend files under version control |

### Environment as found (verified 2026-08-20)

| Thing | State |
|---|---|
| WordPress | 7.1, fresh install, site title still "My Blog" |
| PHP | 8.1.34 — **bump to 8.2 or 8.3 in the host panel if offered** |
| Server | LiteSpeed |
| Theme | twentytwentyfive (stays, never renders publicly) |
| Front page | Set to *Posts* — must change to a static page |
| Application Passwords | Available ✅ (needed for draft preview) |
| `cms.` subdomain | Does not exist yet |
| `/graphql` | 404 — WPGraphQL not installed yet |
| Cloudflare | Not in front of the domain yet |

---

## 2. Status legend

| Mark | Meaning |
|---|---|
| ✅ | Done and verified |
| 🔄 | In progress |
| ⏳ | Pending, not started |
| 🚫 | Blocked — see §6 |
| ⏭️ | Deliberately skipped |

---

## 3. The one rule that governs every file

**Client-first, kit-shaped.** This real site *becomes* the reusable kit; it is not built in the
abstract first. Full reasoning in `changeslog.md` §2 — read it before questioning the approach.

The operational rule, which applies to every commit:

> Nothing client-specific may live anywhere except **`web/src/app/globals.css`** (brand tokens)
> and the **ACF Options page** in wp-admin (logo, phone, address, socials, footer copy).
>
> If a component hardcodes the word "cleaning", it is built wrong.

Kit extraction is **Phase 17**: mark the repo as a GitHub template, freeze ACF field names, write
`setup.sh`. Project 02 clones it and we refactor whatever did not fit.

---

## 4. Phase tracker

| # | Phase | Owner | Status | Notes |
|---|---|---|---|---|
| 00 | Recon — verify install state | Claude | ✅ | See §1 |
| 01 | Repo + folder structure + `CLAUDE.md` | Claude | ✅ | Pushed to GitHub `main`, 7 commits, 39 files. History audited for secrets — clean. |
| 02 | Move WP to `cms.` subdomain | **You** | ⏳ | Host panel + DNS. **Do before any content.** |
| 03 | `wp-config.php` headless block | **You** | ⏳ | `wp/wp-config-snippet.php` ready to paste |
| 04 | Install plugin set | **You** | 🚫 | Blocked on B-01 (ACF Pro licence) |
| 05 | Upload bridge plugin | **You** | ⏳ | `wp/headless-bridge.php` ready to upload |
| 06 | Next.js scaffold | Claude | ✅ | Next 16.3.1, React 19.2, Tailwind 4.3 |
| 07 | GraphQL client + queries | Claude | ✅ | `lib/wp.ts`, `lib/queries.ts`, `lib/types.ts` |
| 08 | Catch-all route + section registry | Claude | ✅ | `pnpm build` green |
| 09 | Design the ACF section library | Claude + You | 🚫 | Blocked on B-01 |
| 10 | Build section components | Claude | 🚫 | Blocked on B-02 (brand brief) |
| 11 | Preview + revalidation wiring | Claude | ✅ | Code done. **End-to-end test pending Phase 04.** |
| 12 | SEO — sitemap, robots, schema | Claude | 🔄 | sitemap + robots + security headers done. Yoast fields and JSON-LD pending Phase 04. |
| 13 | Contact form via Resend | Claude | ⏳ | Needs verified sending domain — B-06 |
| 14 | Vercel deploy + DNS cutover | Claude + You | ⏳ | Can start as soon as Phase 02 is done |
| 15 | Content entry — all pages | **You** | ⏳ | |
| 16 | QA against the launch checklist | Claude + You | ⏳ | Checklist in §7 |
| 17 | Extract the kit | Claude | ⏳ | Template repo, `setup.sh`, freeze names |

### What exists in the repo right now

| File | Does |
|---|---|
| `wp/headless-bridge.php` | Redirects, preview links, revalidation webhook, ACF local JSON, menu locations, `noindex` header |
| `wp/wp-config-snippet.php` | Pinned URLs, shared secrets, hardening. **Gitignored — holds real secrets.** |
| `web/src/lib/wp.ts` | `wpQuery()` with cache tags + authenticated preview; `toUri()`; `uriTag()` |
| `web/src/lib/queries.ts` | `NODE_BY_URI`, `ALL_URIS`, `SITE_SETTINGS`, `SITEMAP` — core fields only, no ACF yet |
| `web/src/app/[[...slug]]/page.tsx` | The one route. `nodeByUri` → `__typename` switch → template |
| `web/src/components/sections.tsx` | Section registry. Empty until Phase 10; warns loudly in dev on unmapped sections |
| `web/src/app/api/revalidate/route.ts` | Webhook target + `GET` health check |
| `web/src/app/api/preview/route.ts` | Draft mode entry, with open-redirect guard |
| `web/src/app/sitemap.ts` `robots.ts` | Public-hostname sitemap, replacing Yoast's |

---

## 5. Site plan — pages and sections

Page set for a cleaning service company. Adjust once the client brief lands.

| Page | URI | Sections planned |
|---|---|---|
| Home | `/` | hero · trust_bar · services_grid · media_text · stats · testimonials · faq · cta_band |
| Services | `/services/` | hero · services_grid · pricing · faq · cta_band |
| Service detail | `/services/<slug>/` | hero · rich_text · media_text · faq · cta_band |
| About | `/about/` | hero · media_text · stats · team · cta_band |
| Areas we cover | `/areas/` | hero · rich_text · area_list · cta_band |
| Contact | `/contact/` | hero · form · map |
| Blog index | `/blog/` | post_feed |
| Post | `/blog/<slug>/` | post template |
| Privacy / Terms | `/privacy/` `/terms/` | rich_text |

### Section library build status

| Layout | ACF | Query fragment | Component | Registered |
|---|---|---|---|---|
| hero | ⏳ | ⏳ | ⏳ | ⏳ |
| trust_bar | ⏳ | ⏳ | ⏳ | ⏳ |
| services_grid | ⏳ | ⏳ | ⏳ | ⏳ |
| media_text | ⏳ | ⏳ | ⏳ | ⏳ |
| stats | ⏳ | ⏳ | ⏳ | ⏳ |
| testimonials | ⏳ | ⏳ | ⏳ | ⏳ |
| pricing | ⏳ | ⏳ | ⏳ | ⏳ |
| faq | ⏳ | ⏳ | ⏳ | ⏳ |
| cta_band | ⏳ | ⏳ | ⏳ | ⏳ |
| rich_text | ⏳ | ⏳ | ⏳ | ⏳ |
| team | ⏳ | ⏳ | ⏳ | ⏳ |
| post_feed | ⏳ | ⏳ | ⏳ | ⏳ |
| form | ⏳ | ⏳ | ⏳ | ⏳ |

> A section is only done when all four columns are ✅. Skipping the query fragment is the
> classic bug — the section renders blank because the data was never requested.

---

## 6. Blockers — live

| ID | Blocker | Severity | Blocks | Owner | Status |
|---|---|---|---|---|---|
| **B-01** | **ACF Pro licence.** Flexible Content and Repeater are Pro-only. Without them there is no page builder and no section library — the architecture does not work. ~$249/yr unlimited sites. | High | Phases 04, 09, 10 | **You** | 🚫 Open |
| **B-02** | **No brand brief.** Need client name, logo, colours, fonts, tone, 2 reference sites, service list, service areas, phone, address. | High | Phase 10 | **You** | 🚫 Open |
| **B-03** | **Is `dripbar.site` the final domain?** If the client brings their own, plan is unchanged — add their domain in Vercel and update `HEADLESS_URL`. CMS can stay on `cms.dripbar.site` permanently. | Low | Phase 14 | **You** | 🚫 Open |
| **B-04** | **SSH / WP-CLI on the host?** Not required, but without it every plugin install is a manual zip upload and `setup.sh` cannot run. Check for "Terminal" or "SSH Access" in the host panel. | Medium | Phase 17 | **You** | 🚫 Open |
| **B-05** | **WordPress 7.1 plugin compatibility unverified.** Cannot confirm from memory that WPGraphQL / WPGraphQL-for-ACF support WP 7.1. Check each plugin page for the "Tested up to" value before relying on it. | Medium | Phase 04 | **You** | 🚫 Open |
| **B-06** | **Resend sending domain.** Contact form needs a verified domain in Resend, which means adding DKIM/SPF DNS records. | Low | Phase 13 | **You** | 🚫 Open |
| **B-07** | **Repo visibility unconfirmed.** No secrets leaked either way — history was audited before the first push. But `headless_core` will hold the commercial kit and, from Phase 09, client content models in `wp/acf-json/`. Set it private while that is still cheap: GitHub → Settings → Danger Zone → Change visibility. Also tick *Template repository* at Phase 17. | Low | Phase 17 | **You** | 🚫 Open |

---

## 7. Launch checklist

Nothing ships until every line is ✅.

- [ ] Every page reachable; no unmapped-section warnings in the build log
- [ ] `pnpm build` passes with zero type errors
- [ ] Lighthouse mobile — performance 95+, accessibility 100, SEO 100
- [ ] `/sitemap.xml` lists `dripbar.site`, never `cms.dripbar.site`
- [ ] `cms.dripbar.site` returns `X-Robots-Tag: noindex`
- [ ] Visiting a `cms.` page as a logged-out user redirects to the public site
- [ ] Edit a page → Update → live change visible within 10 seconds
- [ ] Preview button opens draft content on the public domain
- [ ] Contact form delivers to Gmail **and** Outlook
- [ ] Styled 404 page
- [ ] OG image renders in the LinkedIn and Facebook debuggers
- [ ] Google Search Console verified, sitemap submitted
- [ ] Analytics firing, consent handled if EU/UK traffic
- [ ] Client has an **Editor** account, not Administrator
- [ ] WP + database backups confirmed running
- [ ] Handover recording made

---

## 8. Decision log — moved

Every decision and its reasoning now lives in **`changeslog.md`**, recorded per session, so the
rationale sits next to the work that produced it.

Read `changeslog.md` §5 before changing any of these — they look like mistakes but are not:

- `revalidateTag(tag, "max")` takes two arguments on Next 16
- no `eslint` key in `next.config.ts`
- `HEADLESS_LIVE` gates the visitor redirect and stays off until Phase 14
- `allowed_redirect_hosts` is required for `wp_safe_redirect` to work cross-host

---

## 9. Secrets inventory

Never commit these. `web/.env.local` and `wp/wp-config-snippet.php` are gitignored; Vercel holds
the production copies. `web/.env.local.example` **is** committed and holds placeholders only —
keep it in step with this table whenever a variable is added.

> Verified 2026-08-20: no secret filename or value exists anywhere in git history, local or on
> `origin/main`. Re-run that audit before any future first push to a new remote.

| Name | Where it lives | Status |
|---|---|---|
| `WP_GRAPHQL_URL` | `.env.local` + Vercel | ⏳ |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` + Vercel | ⏳ |
| `WP_APP_USER` / `WP_APP_PASSWORD` | `.env.local` + Vercel | ⏳ WP user not created |
| `PREVIEW_SECRET` | `.env.local` + Vercel + `wp-config.php` | ⏳ must match exactly |
| `REVALIDATE_SECRET` | `.env.local` + Vercel + `wp-config.php` | ⏳ must match exactly |
| `RESEND_API_KEY` | `.env.local` + Vercel | ⏳ |
| `CONTACT_TO` | `.env.local` + Vercel | ⏳ |
