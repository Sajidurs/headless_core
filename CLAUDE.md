# Headless WordPress — Project 01 (cleaning service)

## Read these two before doing anything

1. **`changeslog.md`** — full project context and history. The business goal, the architecture,
   every decision and *why*, verified technical findings that contradict online tutorials, and
   the gotchas that break this stack. Written to bring any assistant fully up to speed from cold.
   **Append a session entry at the end of every working session** (template is in its §9).
2. **`SYSTEM.md`** — current state: phase tracker, live blocker table, launch checklist.
   **Edit rows in place** as status changes.

Ownership boundary, so the two never drift: `changeslog.md` owns **history and reasoning** and is
append-only. `SYSTEM.md` owns **current status** and is mutable. Decisions and their rationale go
in `changeslog.md` only.

## Shape of the repo

| Path | What it is |
|---|---|
| `web/` | Next.js 16 frontend. The only thing visitors ever touch. |
| `wp/` | WordPress files under version control — bridge plugin, ACF field group JSON, config snippet. |
| `wp/acf-json/` | The content model as files. **This is the reusable asset.** Never edit by hand; ACF writes it. |
| `SYSTEM.md` | Phase tracker, blockers, decisions. |

Backend is `cms.dripbar.site` (WordPress 7.1, PHP 8.1, LiteSpeed). Public site is `dripbar.site` on Vercel.
Data travels one way only: WordPress → WPGraphQL → Next.js Server Components → static HTML.

## Stack facts that change how you write code

- **Next.js 16.3**, React 19.2, Tailwind **v4**, TypeScript. App Router, `src/` directory.
- `revalidateTag(tag, profile)` takes a **required second argument** in Next 16 — pass `"max"`.
  The one-argument Next 15 form does not compile. `updateTag()` exists but is Server Actions only.
- `params` is a **Promise** — always `const { slug } = await params`.
- `draftMode()` and `cookies()` are async — always await them.
- Tailwind v4 has **no `tailwind.config.js`**. Tokens are declared in `@theme` inside
  `src/app/globals.css`. Plugins load via `@plugin`.
- `fetch` is **not cached by default**. `wpQuery` sets `cache: "force-cache"` deliberately.
  Removing that makes every visitor wait on PHP.

## Hard rules

1. **Never fetch WordPress data in a Client Component.** All reads happen in Server Components
   through `wpQuery()` in `src/lib/wp.ts`. No SWR, no react-query, no `useEffect` fetching.
2. **One route.** `src/app/[[...slug]]/page.tsx` renders every URL via `nodeByUri`. Do not add
   routes for new page types — add an ACF layout and a section component instead. Route handlers
   under `src/app/api/` are the only exception.
3. **`"use client"` only for real interactivity** — accordion state, carousel, form submission.
   Never on a whole section because one child needs a hover effect.
4. **Every colour, font, radius, and section spacing comes from a token** in `globals.css`.
   No hex literals in components. No arbitrary values like `text-[15px]` or `mt-[37px]`.
5. **Nothing client-specific outside two places.** `globals.css` tokens and the ACF Options page.
   If a component hardcodes the word "cleaning", it is built wrong — see `SYSTEM.md` §3.
6. **Images:** always `next/image`, always real `width`/`height` from `mediaDetails`,
   `priority` only on the first hero image per page. Never a bare `<img>`.
7. **No new dependency without asking.** shadcn/ui components are copied in, not installed.

## Adding a section — always all four steps

1. **ACF** — new layout under the `sections` Flexible Content field. `snake_case` name.
   Tick *Show in GraphQL* on the field group and set an explicit *GraphQL Field Name*.
2. **`web/src/lib/queries.ts`** — add the inline fragment to `NODE_BY_URI`.
3. **`web/src/components/sections/<name>.tsx`** — build it, props typed.
4. **`web/src/components/sections.tsx`** — register it in `REGISTRY`.

Then tick the row in `SYSTEM.md` §5.

> Skipping step 2 is the classic failure: the component is found but renders blank, because the
> data was never requested. If a section is empty on the page, check the query fragment first.

## ACF naming is an API contract

ACF field and layout names become GraphQL type names. Renaming one after the client is live
breaks the frontend silently — the query returns null and the section vanishes. Freeze names
once content entry begins.

## Accessibility floor — non-negotiable

Semantic landmarks, exactly one `h1` per page, headings in order with no skipped levels,
visible focus rings, 4.5:1 text contrast, every interactive element keyboard reachable,
alt text on every meaningful image and `alt=""` on decorative ones.

## Debug order for a blank or wrong section

Always in this order — it saves an afternoon:

1. **GraphiQL in wp-admin.** Run the query by hand. Is the data actually there?
   If no → the ACF field group is not exposed to GraphQL, or the field name differs.
2. **`queries.ts`.** Is the inline fragment present and is the type name spelled right?
3. **`sections.tsx`.** Is it in `REGISTRY`? In dev you get a red dashed warning box if not.
4. **The component itself.**

## Before you say a task is done

Run `pnpm build` in `web/`. It must pass with zero type errors and no unmapped-section warnings.
Type mismatches between the GraphQL shape and component props are the most common failure in this
architecture, and the build catches all of them.
