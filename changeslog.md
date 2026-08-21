# changeslog.md — full project context and history

> **If you are an AI assistant picking up this project: read this entire file first.**
> It is written to be self-sufficient. After reading it you should understand the business
> goal, the architecture, every decision made and why, what is currently blocked, and what
> to do next — without needing to ask the user to re-explain anything.
>
> Then read `SYSTEM.md` for live status, and `CLAUDE.md` for the coding rules.

---

## 0. How these three files relate — do not blur this

| File | Owns | Mutability |
|---|---|---|
| **`changeslog.md`** (this file) | History, orientation, decisions **and the reasoning behind them**, session log | **Append-only.** Never rewrite history. Correct a past entry by adding a new one that supersedes it. |
| **`SYSTEM.md`** | Current state: phase tracker, live blocker table, launch checklist, secrets inventory | Mutable. Edit rows in place as status changes. |
| **`CLAUDE.md`** | Coding rules and conventions for the repo | Rarely changes. |

**Rule:** live blocker *status* lives in `SYSTEM.md` only. This file records *when a blocker
appeared, what it means, and how it was resolved*. If you find yourself updating the same fact
in both files, you are doing it wrong — put status in `SYSTEM.md`, put the story here.

### Update protocol for whoever works next

At the end of any working session, append a new `## Session NN` block at the top of §7 using
the template at the end of this file. Record:

1. What was asked
2. What was actually built or changed, with file paths
3. **Every decision and its reasoning** — this is the most valuable part; a future AI that knows
   *why* will not undo it
4. Anything discovered that contradicts earlier assumptions
5. What is blocked and on whom
6. The exact next action

Then update the phase and blocker tables in `SYSTEM.md` to match.

**Two failure modes this protocol has already hit — guard against both:**

1. **Work continues past the log entry.** The entry gets written mid-session, then more work
   happens and never gets recorded. Write the entry *last*, and if in doubt just ask
   *"is the changeslog current?"* before closing the project.
2. **A log entry can never cite its own commit.** The commit that writes an entry has no SHA
   until it exists, and amending to insert the SHA changes the SHA again — it is unfixable, not
   merely awkward. So the steady state is a **one-commit trailing gap**, and that is fine. Cite
   the previous doc-sync commit at the top of the next entry's table.

**Self-audit — run this to check the log is complete:**

```bash
git log --oneline --reverse | awk '{print $1}'            # every commit in the repo
grep -oE '`[0-9a-f]{7}`' changeslog.md | tr -d '`' | sort  # every commit cited here
```

Every SHA in the first list must appear in the second, **except** the single most recent commit
when that commit is the one that wrote the current entry. Any other gap is unlogged work — find
it with `git show <sha> --stat` and add an entry.

---

## 1. Who the user is and what they actually want

**Background.** Long-time WordPress professional, expert with Elementor Pro. Current delivery
process: install WordPress, install Elementor Pro, hand-design the whole site — **7 to 10 days
per client.**

**The goal.** Replace that with a headless stack — WordPress as backend, Next.js as frontend —
so a complete client site ships in **1 to 2 days.** The intended workflow is: the user sets up
infrastructure and content, then directs an AI coding assistant to design and build all the
pages, then delivers to the client. Speed and repeatability are the point.

**What this means for how you should work.** The user is technically strong on WordPress and
weaker on React/Next.js — explain frontend reasoning, do not explain WordPress basics. They
want working code plus an explanation of what is happening, not just code. They respond well to
being told when something they asked for is a bad idea, with the reasoning.

**Business framing agreed in Session 01.** Headless is a **premium tier**, not a replacement for
Elementor. Suitable: brochure, services, lead-gen, content/SEO-driven sites, budgets above
roughly $2,500. Keep Elementor for: e-commerce (WooCommerce), membership/LMS, clients who insist
on moving things themselves, anything under roughly $1,500, or needed this week.

**Reference document.** A full playbook was produced in Session 01 and published as an artifact:
`https://claude.ai/code/artifact/5addd3ca-b9a9-42e3-89cd-3ceb3dc34a88`
(private to the user; covers stack rationale, 11 build phases, per-client runbook, 12 blockers,
trade-offs, cost model). This changeslog supersedes it wherever the two disagree, because the
playbook was written before the real environment was inspected.

---

## 2. The strategic decision that shapes everything

**Client-first, kit-shaped. Decided Session 01.**

The playbook originally said: spend 3–4 weeks building a reusable kit, *then* start taking
headless clients. That was revised. The actual plan:

> Build this one real client site, but build it so that it *becomes* the kit. Extract the
> reusable template from it at the end (Phase 17).

**Reasoning — do not undo this without reading it.** A section library designed in the abstract,
with no real site to validate it, produces roughly twelve sections of which four are wrong and
three are missing. A real project forces correct abstractions. It also converts 3–4 weeks of
unpaid speculative work into paid client work.

**The condition that makes it work — this is a hard rule, enforced in `CLAUDE.md`:**

Nothing client-specific may live anywhere except two places:

1. `web/src/app/globals.css` — the brand tokens (`@theme` block)
2. The ACF Options page in wp-admin — logo, phone, address, socials, footer copy

If a component hardcodes the word "cleaning", it is built wrong. This discipline costs about
10% extra on this project and saves the entire kit-build phase.

---

## 3. Architecture — the four ideas that matter

Understand these four and the codebase makes sense.

**1. One route renders the whole site.**
WPGraphQL exposes `nodeByUri`: hand it any path and it returns whatever WordPress thinks lives
there — page, post, category, custom post type. So `web/src/app/[[...slug]]/page.tsx` (an
*optional* catch-all — double brackets, so it also matches `/`) handles every URL. It switches
on `__typename` to pick a template. **You will almost never add another route.** New page types
become new ACF layouts and new section components.

**2. ACF Flexible Content is the Elementor replacement.**
One field group on Pages holds a single Flexible Content field named `sections`. Each layout
inside it is a section type the client can add, reorder, and remove. This is what gives the
client back a sense of layout control. Building it well is most of the project's value.

**3. ACF Local JSON makes the content model a git asset.**
Two filters in the bridge plugin redirect ACF's storage from the database to
`wp-content/mu-plugins/acf-json/`. Copy that folder into the next client's install and the
entire content model appears in wp-admin ready to use. **This is the single highest-leverage
thing in the project** — without it, every new client means re-clicking ~200 fields by hand and
the 1–2 day target is dead.

**4. Cache tags make a static site feel live.**
`wpQuery()` attaches tags (`"wp"`, and `uri:/about/`) to every cached fetch. WordPress POSTs to
`/api/revalidate` on save; that route purges the matching tags; the next visitor gets fresh
HTML. This is why the site can be fully pre-rendered and still update in seconds.

### Data flow, one direction only

```
WordPress (cms.example.com)
  → WPGraphQL /graphql
    → wpQuery() in Server Components   [never in a Client Component]
      → static HTML on Vercel CDN (example.com)

WordPress save → /api/revalidate → revalidateTag() → page rebuilds
WordPress Preview button → /api/preview → draft mode cookie → authenticated uncached fetch
```

---

## 4. Environment

**Current, verified values live in `SYSTEM.md` §1** — domains, host, IP, paths, and what is
installed. They are deliberately not duplicated here, because they change: the project already
moved hosts and domains once (see Session 03).

What is stable and worth stating as *principle* rather than fact:

**Domain plan.** The apex domain → Vercel (the public site). A `cms.` subdomain → WordPress,
**sharing the same document root** as the apex. One install, one database, two hostnames. A
second WordPress install would split content from the frontend reading it.

**Where client-specific values are allowed to exist** — this is a hard rule, and it is why the
domain migration in Session 03 touched no committed source:

| Value | Lives in | Committed? |
|---|---|---|
| Public site URL, GraphQL URL | `web/.env.local` + Vercel env vars | ❌ gitignored |
| WP URLs, shared secrets | `wp/wp-config-snippet.php` | ❌ gitignored |
| Brand colours, fonts | `web/src/app/globals.css` `@theme` | ✅ |
| Logo, phone, address, socials | ACF Options page in wp-admin | n/a |

Committed code reads env vars through `web/src/lib/env.ts`, which **throws on a missing value
rather than falling back to a default**. Reasoning in §5. Comments and examples use `example.com`.

**User's accounts:** Vercel, GitHub, Resend, Cloudflare.

---

## 5. Verified technical findings — these contradict most online tutorials

Each of these was confirmed by reading the installed package types or by reasoning through the
actual request flow, not from memory. **Do not "fix" the code back to the tutorial version.**

### Next.js 16.3.1 changed the cache API

`revalidateTag` now takes a **required second argument** — a cacheLife profile name or an
`{ expire }` object:

```ts
revalidateTag("wp", "max");   // correct on Next 16
revalidateTag("wp");          // Next 15 form — does NOT compile on 16
```

Verified in `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`. Also new there:
`updateTag(tag)` (Server Actions only, read-your-own-writes) and `refresh()`. Nearly every
tutorial online still shows the one-argument form.

### Next.js 16 removed the `eslint` key from `next.config.ts`

Linting is no longer part of `next build`. Including the key is a hard type error. Run
`pnpm lint` separately. `typescript: { ignoreBuildErrors: false }` is still valid.

### `wp_safe_redirect()` cannot redirect cross-host

It validates the target through `wp_validate_redirect()`, which allows only the site's own host
and **silently rewrites anything else to `/wp-admin/`**. Since the frontend is a different
hostname, every visitor would have landed on the login screen. Fixed by registering the frontend
host via the `allowed_redirect_hosts` filter in the bridge plugin.

### The redirect loop that hostname detection cannot catch

This one is subtle and cost real thought. Before DNS cutover:

```
visitor → cms.example.com/about
        → bridge plugin redirects to example.com/about
        → example.com still resolves to this same server, so WordPress serves it
        → WordPress's own redirect_canonical sees WP_HOME is cms.example.com
        → 301 back to cms.example.com/about
        → infinite loop
```

Checking the incoming `Host` header does **not** prevent this, because each individual hop looks
legitimate in isolation. PHP also cannot reliably determine where a domain's DNS currently
points. So the redirect is gated behind an **explicit constant**, off by default:

```php
// wp-config.php — uncomment ONLY at DNS cutover (Phase 14)
// define( 'HEADLESS_LIVE', true );
```

**Consequence during the build:** both `example.com` and `cms.example.com` serve WordPress,
and the apex 301s to the CMS subdomain. This looks odd but is harmless — nobody is visiting yet.

---

## 6. Gotchas that will break the site if forgotten

A checklist of traps specific to this stack. Most cost an afternoon each.

1. **Block themes register no classic menu locations.** twentytwentyfive uses Navigation blocks,
   but WPGraphQL exposes menus through classic locations. Without `register_nav_menus()` the
   `PRIMARY` enum does not exist in the schema and `SITE_SETTINGS` errors. Registered in the
   bridge plugin (section 5) rather than a theme, so it survives theme switches.

2. **ACF field names are an API contract.** ACF field and layout names become GraphQL type
   names. Renaming one after go-live breaks the frontend *silently* — the query returns null and
   the section simply vanishes. Freeze names once content entry begins.

3. **WPGraphQL for ACF v2 requires explicit opt-in per field group.** Tick *Show in GraphQL* and
   set an explicit *GraphQL Field Name*. Forget it and the fields do not exist in the schema at
   all, with no error. Most commonly lost half-hour in this stack.

4. **Adding a section is four steps, always all four.** ACF layout → query fragment in
   `queries.ts` → component → registry entry in `sections.tsx`. Skipping the query fragment is
   the classic bug: the component is found but renders blank because the data was never
   requested. Dev mode shows a red dashed warning box for unregistered sections.

5. **`fetch` is not cached by default in Next 15+.** `wpQuery` sets `cache: "force-cache"`
   deliberately. Removing it makes every visitor wait on PHP.

6. **Never install a caching plugin on the WordPress side.** It will serve stale GraphQL
   responses and the cause is not obvious.

7. **`params` is a Promise** in Next 16. So are `draftMode()` and `cookies()`. Always `await`.

8. **Tailwind v4 has no `tailwind.config.js`.** Tokens live in an `@theme` block inside
   `globals.css`; plugins load via `@plugin`.

9. **Yoast's sitemap emits `cms.` URLs.** Submitting it would index the backend and split the
   client's search authority. The sitemap is generated in `web/src/app/sitemap.ts` instead.

10. **Debug order for a blank/wrong section — always this order:** GraphiQL in wp-admin (is the
    data there at all?) → `queries.ts` fragment → `sections.tsx` registry → the component.

---

## 7. Session log

*Newest first. Each entry is self-contained.*

### Session 03 — 2026-08-21 · domain and host migration

**Asked.** The project has moved: `dripbar.site` is abandoned, `jahidpro.com` is the new domain
with a fresh WordPress install, and `cms.jahidpro.com` is already created with SSL. Swap the old
domain for the new one.

**Verified about the new environment before changing anything.**
- `jahidpro.com` and `cms.jahidpro.com` both resolve to `141.95.34.163` and return **identical**
  responses, with the REST `Link` header on both pointing at the same install. So the subdomain
  correctly **shares the apex document root** — one install, two hostnames. No second install.
- SSL on `cms.` is valid (`ssl_verify_result=0`); `/wp-admin/` 302s to login as expected.
- **This is a different server.** Old host was LiteSpeed at `103.159.36.86` (cPanel user
  `myaimgenius`); the new one is **nginx** at `141.95.34.163` (OVH range). PHP is 8.1.34 on both.
  **Every filesystem path recorded in Session 01 is now void** — see B-08.
- WordPress 7.1, fresh, "My Blog", front page still set to Posts. `home`/`siteurl` still the apex.
- `/graphql` still 404 — WPGraphQL not installed on this host either.

**The finding that changed the shape of the work.** Every occurrence of the old domain in
`web/src/` was a **hardcoded fallback** — `process.env.NEXT_PUBLIC_SITE_URL ?? "https://dripbar.site"`
— in four files, plus comment examples in `wp/headless-bridge.php` and `revalidate/route.ts`.

Swapping one client's domain for another in committed source would have left the same trap for
the next client. So the fix was to establish the rule instead:

> **No committed file names a client domain.** Real values live only in `web/.env.local` and
> `wp/wp-config-snippet.php` (both gitignored) plus Vercel env vars. Comments use `example.com`.

**Built / changed.**
- **`web/src/lib/env.ts`** *(new)* — `siteUrl()` and `graphqlUrl()`, which **throw** on a missing
  value rather than defaulting. Documents why a literal `process.env.NEXT_PUBLIC_*` access is
  required (dynamic lookups are not inlined at build time and come back undefined in client
  components).
- `web/next.config.ts` — fallback removed, explicit throw with a fix-it message.
- `web/src/app/robots.ts`, `sitemap.ts`, `layout.tsx` — now call `siteUrl()`.
- `wp/headless-bridge.php` (9 refs), `web/src/app/api/revalidate/route.ts` (1 ref) — comment
  examples genericised to `example.com`. These are kit files; they should never need per-client
  edits again.
- `web/.env.local`, `wp/wp-config-snippet.php` — real `jahidpro.com` values. Gitignored.
- `CLAUDE.md` — new domain, corrected server (nginx not LiteSpeed), and the no-domains-in-source
  rule.
- `SYSTEM.md` — §1 rewritten with the new host and a migration note; §4 Phase 02 marked ✅
  (subdomain exists); new **B-08**; B-03 rewritten; launch checklist domains updated.
- `changeslog.md` — §4 replaced with a pointer to `SYSTEM.md` §1 plus the where-client-values-live
  table (it was duplicating live state); §3 and §5 examples genericised. **§7 history left
  untouched** — it correctly records that the project was on `dripbar.site`.

**Verified.**
- `rm -rf .next && pnpm build` → passes, 7 routes emitted. The two GraphQL warnings are the
  designed graceful degradation: `/graphql` is 404, and the try/catch in `generateStaticParams`
  and `sitemap.ts` degrades instead of failing the build.
- `pnpm lint` clean.
- Build output contains `jahidpro.com` and **zero** occurrences of the old domain.
- **Negative test:** `WP_GRAPHQL_URL="" npx next build` → exits 1 with
  `Error: Missing required environment variable WP_GRAPHQL_URL`. The guard works.

**Decisions and reasoning.**

| Decision | Why |
|---|---|
| Remove hardcoded domain fallbacks entirely rather than updating them | These values become canonical tags, OG URLs, and the sitemap. A stale fallback would silently publish canonicals and a sitemap pointing at *another client's domain* — an SEO failure nobody notices for weeks. A build that fails with a clear message is strictly better than one that succeeds wrongly. |
| Genericise comments in kit files to `example.com` | `headless-bridge.php` is copied verbatim to every client. Naming one client in its comments guarantees stale docs on every other. |
| Real domains only in the two gitignored config files | Makes the next migration a two-file edit instead of an eleven-file search-and-replace. Already proved: B-03 downgraded from a real risk to a triviality. |
| Replace `changeslog.md` §4 with a pointer to `SYSTEM.md` §1 | It held live environment facts, which is `SYSTEM.md`'s job. Keeping both is exactly the drift the §0 boundary exists to prevent — and this migration is what exposed it. |
| Leave §7 session history naming the old domain | It is a record of what happened, not a statement about the present. Rewriting it would destroy the audit trail. |

**Discovered / corrected.**
- `CLAUDE.md` said the backend runs LiteSpeed. True of the old host, wrong now — corrected to
  nginx.
- Session 01's document-root discovery (`/home/myaimgenius/dripbar.site`) is now worthless. The
  new host's panel type is unknown, so the path has to be re-found. Tracked as **B-08**, and it
  blocks Phases 03 and 05 — i.e. everything on the WordPress side.
- The `changeslog.md` §4 / `SYSTEM.md` §1 duplication existed since Session 01 and only surfaced
  because the facts changed. Worth remembering: duplicated state looks harmless until it is wrong.

**Commits.**

| SHA | What |
|---|---|
| `61ac429` | docs: correct the self-reference guidance in the log protocol *(from Session 02)* |

**Blocked on.** **B-08** — the document root on the new host. Nothing on the WordPress side can
proceed without it. Then **B-01** (ACF Pro licence).

**Immediate next action.** Get the document root: the panel's file manager, showing the folder
that contains `wp-config.php`, or `pwd` over SSH. Then paste the wp-config block, upload
`headless-bridge.php` to `wp-content/mu-plugins/`, and install WPGraphQL so `/graphql` responds.

---

### Session 02 — 2026-08-20 · repo published

*Continuation of Session 01 on the same working day — no context was lost between them.*

**Asked.** Push the code to `https://github.com/Sajidurs/headless_core.git`. The user pasted
GitHub's blank-repository boilerplate (`git init` / `git add README.md` / `git commit` /
`git branch -M main` / `git remote add` / `git push`).

**Did not run that snippet as-is.** It is written for an empty directory. `git init` on an
existing repo plus a README-only commit would have stacked a redundant commit on top of the six
we already had. Wired the existing history to the remote instead, preserving all commits.

**Built / changed.**
- `README.md` (root) — repo front door. Points at `changeslog.md` as the cold-start read, and
  documents layout, stack, and the four-sentence architecture summary. Written as the kit
  template's front page, not a one-line stub.
- `web/.env.local.example` — committed template with **placeholders only**, so a new client build
  knows what to fill in.
- `web/.gitignore` — added `!.env.local.example`.
- Branch renamed `master` → `main`.
- Remote `origin` added; pushed with `-u`.

**Verified.**
- **Security audit before pushing**, across *all* of git history rather than just the working
  tree — a secret committed once persists in history even after deletion. Two checks: (a) no
  sensitive filenames in any commit (`git log --all --name-only`), (b) the literal secret values
  appear in no blob (`git grep` across `git rev-list --all`). Both clean.
- Re-audited `origin/main` after the push: no `.env`, no `wp-config-snippet.php`, no key files.
- 7 commits and 39 files on the remote; `git status -sb` shows local and remote in sync.
- Only `web/.env.local.example` is tracked among env files; `web/.env.local` and
  `wp/wp-config-snippet.php` confirmed still ignored via `git check-ignore -v`.

**Decisions and reasoning.**

| Decision | Why |
|---|---|
| Preserve existing history rather than following GitHub's boilerplate | Seven meaningful commits with real reasoning in their messages. A fresh `git init` would have discarded or duplicated that. |
| Commit an `.env.local.example` with placeholders | The real `.env.local` is gitignored, so without a committed template a new client build has no record of which variables exist. Standard practice, and it matters more here because this repo is the kit. |
| Audit full history, not just the working tree, before the first push | Secrets are real and the repo's visibility was unknown. Once pushed, a leaked secret must be treated as compromised regardless of later deletion — the check has to happen *before*, and it has to cover history. |

**Discovered / corrected.**
- `web/.env.local.example` silently failed to stage. Cause: `create-next-app` writes a blanket
  `.env*` into `web/.gitignore` (line 34), which catches it. Diagnosed with
  `git check-ignore -v`. Fixed with an explicit negation. **Worth remembering — this will recur
  on every new client scaffold** until the fix is part of the template.
- No secrets ever entered git history, so no history rewrite was needed. Confirmed, not assumed.

**Commits.**

| SHA | What |
|---|---|
| `6768473` | docs: add root README and committed env template |
| `0b138b9` | docs: log session 02 and sync SYSTEM.md |
| `0e87ed9` | docs: close changeslog coverage gap and add a self-audit |

**Blocked on.** Unchanged from Session 01 — the user creating `cms.dripbar.site`, and **B-01**
(ACF Pro licence).

**New open item.** Repository visibility was never confirmed. Nothing leaked either way, but the
repo will hold the commercial kit and, from Phase 09, client content models in `wp/acf-json/`.
Tracked as **B-07** in `SYSTEM.md`.

**Immediate next action.** Unchanged: ask what `https://cms.dripbar.site/wp-admin` shows, and get
an answer on B-01.

---

### Session 01 — 2026-08-20

**Asked.** Three things, in order: (a) a complete guide to headless WordPress with blockers and
trade-offs; (b) start the first real project — a cleaning services company — with step-by-step
guidance, code, and explanations, plus a tracking file; (c) two design questions.

**Environment at start.** Empty folder `c:\Users\bappe\Documents\headless`. Node 24.15, npm
11.12, pnpm 11.17, git 2.53. No `gh`, `php`, or `wp-cli` locally (WordPress is remote — fine).
Fresh WordPress at `https://dripbar.site`.

**Built.**

*Backend, `wp/`:*
- `headless-bridge.php` — the entire backend integration as one must-use plugin. Seven sections:
  visitor redirect (gated), preview link rewriting, revalidation webhook, ACF Local JSON,
  classic menu locations, `X-Robots-Tag: noindex`, admin tidying. Must-use means the client
  cannot deactivate it.
- `wp-config-snippet.php` — pinned URLs, generated shared secrets, hardening. **Gitignored,
  contains real secrets.**
- `acf-json/` — empty, awaiting Phase 09.

*Frontend, `web/` — Next.js 16.3.1, React 19.2.8, Tailwind 4.3.3, TypeScript:*
- `src/lib/wp.ts` — `wpQuery()` with cache tags and authenticated preview, `toUri()`, `uriTag()`
- `src/lib/queries.ts` — `NODE_BY_URI`, `ALL_URIS`, `SITE_SETTINGS`, `SITEMAP`
- `src/lib/types.ts` — hand-written result types
- `src/app/[[...slug]]/page.tsx` — the one route, with `generateStaticParams` and
  `generateMetadata`
- `src/components/sections.tsx` — the section registry (empty until Phase 10)
- `src/components/page-content.tsx`, `post-view.tsx` — interim templates
- `src/app/api/revalidate/route.ts` — webhook + `GET` health check
- `src/app/api/preview/route.ts`, `preview/exit/route.ts` — draft mode, with open-redirect guard
- `src/app/sitemap.ts`, `robots.ts`, `not-found.tsx`, `layout.tsx`, `globals.css`
- `next.config.ts` — image remote patterns derived from the env var, capped qualities, security
  headers, `redirects.json` passthrough

*Docs:* `SYSTEM.md`, `CLAUDE.md`, `.gitignore`, and this file.

**Verified.** `pnpm build` passes with zero type errors. Routes emitted: `/[[...slug]]` (SSG),
three API routes (dynamic), `/robots.txt`, `/sitemap.xml`, `/_not-found` (static). The two
warnings during build are the *designed* fallback: `cms.dripbar.site` does not resolve yet, and
the try/catch in `generateStaticParams` and `sitemap.ts` degrades gracefully instead of failing
the build. `pnpm lint` clean. Secrets confirmed absent from git.

**Decisions and reasoning.**

| Decision | Why |
|---|---|
| Client-first, kit-shaped (revises the playbook) | See §2 |
| Phase-1 queries use core WordPress fields only — no ACF, no Yoast | Proves the whole pipeline end-to-end before either paid plugin is bought. ACF fragments layer in at Phase 09, Yoast SEO fields at Phase 12. |
| Plain `fetch`, no GraphQL client library | Needs precise control over Next cache tags; every abstraction makes that harder to reason about. Zero runtime dependencies. |
| Menu locations registered in the mu-plugin, not a theme | Block theme registers none; also survives theme switches and travels to the next client. |
| Forms will bypass WordPress entirely (Next route handler + Resend) | No PHP mail deliverability problems, no plugin, no spam surface. |
| Sitemap/robots generated in Next.js | Yoast emits `cms.` URLs — would split search authority. |
| `revalidateTag(tag, "max")` two-arg form | Verified against installed Next 16.3.1 types. See §5. |
| `eslint` key removed from `next.config.ts` | Next 16 dropped it. See §5. |
| Image `qualities: [70, 85]`, trimmed `deviceSizes` | Each extra quality/size multiplies the optimised variants Vercel bills for. No visible quality difference. |
| Visitor redirect gated behind `HEADLESS_LIVE`, off by default | The loop in §5 cannot be auto-detected. |
| Interim templates render Gutenberg HTML via `@tailwindcss/typography` | Lets content flow end-to-end before the ACF builder exists. |
| 302 not 301 for the visitor redirect until launch | A mistake cannot get permanently cached in browsers or ISP proxies. Switch to 301 at Phase 16. |

**Corrected mid-session.** Initially told the user `wp-config.php` was in `public_html`. A cPanel
screenshot showed the real document root is `/home/myaimgenius/dripbar.site`. All paths updated
in `SYSTEM.md` §1.

**Design questions answered** (worth preserving — this reasoning shapes Phase 09/10):

*Can a few repeatable blocks produce creative, modern designs?* Yes, because **blocks are content
contracts, not designs.** A `hero` block is a data shape (heading + sub + image + CTAs); what it
looks like lives entirely in the React component. Variety comes from three axes: brand tokens;
component implementation; and a **`variant` select field on every layout** so one ACF layout maps
to 3–4 genuinely different designs. 12 layouts × 3 variants = 36 section designs.

Headless actually raises the design ceiling versus Elementor — you own the whole DOM and
stylesheet, so real type scales, container queries, and `:has()` become available, where
Elementor fights you with nested divs and inline styles.

*What is genuinely lost:* per-page bespoke art direction. In Elementor you can invent a unique
asymmetric About-page layout that afternoon. Here that is a new component, 30–60 minutes. Accept
the cost when a signature moment is worth it.

**→ Action for Phase 09: add a `variant` field to every ACF layout when the model is designed.**
Nearly free then, expensive to retrofit once names are frozen (see §6.2).

*Can an AI design the pages?* Split answer. **Execution — strong:** implementing a direction
consistently across 12 components, Tailwind craft, responsive behaviour, accessibility, motion.
**Originating art direction — weak:** from a blank prompt it converges on recognisable defaults
(cream + serif + terracotta; near-black + acid green; purple-blue gradient hero; Inter
everywhere; rounded cards with accent rails; emoji section markers). So the user must supply
references or a written direction — that is the highest-leverage ten minutes in the project.

Workflow that works: user supplies references → AI produces a **design plan first** (palette as
named hexes, type pairing, layout concept) *before any code* → build one section per turn with
review → final coherence pass across all sections.

**Business risk flagged.** If only tokens change between clients, the sites will look
recognisably identical — same layouts, same rhythm, different colours. Clients in the same city
Google each other. Per client, genuinely restyle components, do not just retint them. That is
the 3–4 hour design pass in the runbook; it is not optional.

**Commits.**

| SHA | What |
|---|---|
| `bd68cb5` | feat: headless WordPress foundation for project 01 |
| `ec74c26` | docs: update SYSTEM.md tracker after foundation phases |
| `26a6279` | fix(wp): redirect loop guard and allowed_redirect_hosts filter |
| `a599656` | fix(wp): gate visitor redirect behind explicit HEADLESS_LIVE switch |
| `cd693ac` | docs: record verified cPanel paths and subdomain decision |
| `08e854d` | docs: add changeslog.md as the cold-start context file |

**Ended blocked on the user.** Creating the `cms.dripbar.site` subdomain in cPanel — Domains →
Create A New Domain → `cms.dripbar.site` → tick *Share document root
(`/home/myaimgenius/dripbar.site`) with "dripbar.site"* → then AutoSSL.

**Immediate next action when the session resumes.** Ask what
`https://cms.dripbar.site/wp-admin` shows:
- Login screen with existing account working → correct, proceed to paste the wp-config block and
  upload the mu-plugin, then install WPGraphQL.
- WordPress *installer* asking for DB details → wrong document root, fix before anything else.
- Certificate warning → AutoSSL unfinished, wait.

Once `/graphql` responds: set `WP_GRAPHQL_URL`, run `pnpm dev`, and get a real page rendering
end-to-end. That milestone unblocks everything downstream.

---

## 8. Open blockers as of the last session

Full live status in `SYSTEM.md` §6. Summary of what they mean:

| ID | Blocker | Why it matters |
|---|---|---|
| **B-01** | **ACF Pro licence** — has the user got one? | Flexible Content and Repeater are Pro-only. Without them there is no page builder and no section library — **the architecture does not work.** ~$249/yr unlimited sites. If the answer is no, the fallback is hand-rolled meta boxes in the bridge plugin: free, more work, and the decision must be made *before* Phase 09. |
| **B-02** | **Brand brief** — client name, logo, colours, fonts, tone, 2 reference sites, service list, service areas, phone, address | Blocks all design work (Phase 10). Reference sites matter most — see the design-question answer in §7. |
| **B-03** | Is the current domain the final one, or will the client bring their own? | Cheap either way now — proved in Session 03. Domains live only in `web/.env.local`, `wp/wp-config-snippet.php`, and Vercel env vars; no committed file names a client domain. |
| **B-04** | SSH / Terminal in the host panel? | Not required, but without it every plugin install is a manual zip upload and `setup.sh` (Phase 17) cannot run. |
| **B-05** | **WordPress 7.1 plugin compatibility is unverified** | Could not confirm WPGraphQL / WPGraphQL-for-ACF support WP 7.1. Check "Tested up to" on each plugin page before relying on them. If WPGraphQL does not support 7.1, that is a project-level problem, not a detail. |
| **B-06** | Resend sending domain | Needs DKIM/SPF DNS records before the contact form can send. |
| **B-07** | Repo visibility unconfirmed | Nothing leaked — history was audited before the first push. But the repo will hold the commercial kit and client content models. Set it private. |
| **B-08** | **Document root unknown on the new host** | The old cPanel path is void after the Session 03 host move. Needed to place the wp-config edit, the mu-plugin, and later `acf-json/`. Blocks Phases 03 and 05 — i.e. everything. |

---

## 9. Template for the next session entry

Copy this to the top of §7 and fill it in.

```markdown
### Session NN — YYYY-MM-DD

**Asked.** <what the user wanted>

**Built / changed.** <file paths and what each does>

**Verified.** <commands run and their actual result — never claim a pass without running it>

**Decisions and reasoning.**
| Decision | Why |
|---|---|
| | |

**Discovered / corrected.** <anything that contradicts an earlier assumption in this file>

**Commits.** <sha — message>

**Blocked on.** <who, what>

**Immediate next action.** <the single concrete thing to do first next time>
```
