# headless_core

Headless WordPress + Next.js delivery kit. WordPress is the content backend; a Next.js App
Router frontend renders the public site as static HTML on a CDN.

Built as a real client project (project 01, a cleaning services company) that doubles as the
reusable template for every project after it.

---

## Start here

| Read | For |
|---|---|
| **`changeslog.md`** | Full project context: goal, architecture, every decision and *why*, verified findings, stack gotchas, session history. **Read this first** — it is written to bring anyone up to speed from cold. |
| **`SYSTEM.md`** | Current status: phase tracker, live blockers, launch checklist. |
| **`CLAUDE.md`** | Coding rules and conventions for this repo. |

Working with an AI assistant on this project? Open the folder and say:
*"Read changeslog.md, SYSTEM.md and CLAUDE.md before doing anything."*

---

## Layout

```
├── web/                        Next.js 16 frontend — the only thing visitors touch
│   ├── src/lib/wp.ts           GraphQL client with cache tags + authenticated preview
│   ├── src/lib/queries.ts      Every GraphQL query
│   ├── src/app/[[...slug]]/    The one route that renders the entire site
│   ├── src/components/         sections.tsx is the section registry
│   └── src/app/api/            revalidate + preview route handlers
│
├── wp/                         WordPress files under version control
│   ├── headless-bridge.php     → wp-content/mu-plugins/
│   ├── wp-config-snippet.php   → paste into wp-config.php  (GITIGNORED, holds secrets)
│   └── acf-json/               The content model as files — the reusable asset
│
├── changeslog.md               History, context, reasoning  (append-only)
├── SYSTEM.md                   Current status  (mutable)
└── CLAUDE.md                   Coding rules
```

## Stack

Next.js 16.3 · React 19.2 · Tailwind 4.3 · TypeScript · WordPress 7.1 · WPGraphQL · ACF Pro
Frontend on Vercel, WordPress on shared hosting behind a `cms.` subdomain.

## Local development

```bash
cd web
pnpm install
cp .env.local.example .env.local   # then fill in the values
pnpm dev
```

`pnpm build` must pass with zero type errors before any task counts as done.

## How the architecture works, in four sentences

1. **One route renders everything.** WPGraphQL's `nodeByUri` resolves any path to whatever
   WordPress thinks lives there, so `app/[[...slug]]/page.tsx` handles every URL.
2. **ACF Flexible Content is the page builder.** Each layout is a section the client can add,
   reorder, and remove — the Elementor replacement.
3. **ACF Local JSON makes the content model a git asset.** Copy `wp/acf-json/` into the next
   client's install and the entire model appears in wp-admin.
4. **Cache tags make a static site feel live.** WordPress pings `/api/revalidate` on save; the
   affected page rebuilds in seconds.

## Setting up a new client from this repo

See `changeslog.md` §2 for the strategy and `SYSTEM.md` §4 for the phase list. Short version:
create the repo from this template, point the env vars at the new WordPress, copy `wp/` onto the
server, replace the brand tokens in `web/src/app/globals.css`, and fill the ACF Options page.

## Secrets

`wp/wp-config-snippet.php` and `web/.env.local` are gitignored and hold real secrets. They are
never committed. Production values live in Vercel's environment variables.
