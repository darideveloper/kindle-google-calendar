## Context

The app is a single Astro page (`src/pages/index.astro`) that renders a rolling 7-day window starting today for an e-ink Kindle browser, with no client JS. Today it builds as a static site: frontmatter runs at build time, fetches Google Calendar ICS feeds via `node-ical`, expands recurring events into the week, and bakes the HTML into `dist/`. A Dockerfile builds the image with `CALENDARS` as a build arg, nginx serves `dist/`, and an external n8n cron fires a Coolify build hook daily to keep the week fresh. This change moves all of that to request-time rendering via Astro SSR.

Astro 7.2.2, Node >= 22.12, pnpm 10. Runtime dependencies: `astro`, `@astrojs/node`, and `node-ical`.

## Goals / Non-Goals

**Goals:**
- Calendar data is always fresh — no daily rebuild, no n8n → Coolify cron.
- `CALENDARS` changes take effect via runtime env, no redeploy.
- Page loads stay fast and Google ICS is not hammered on every request.
- Keep the exact same Kindle-rendered output, CSS, and no-JS behavior.

**Non-Goals:**
- No client-side interactivity or JS island added.
- No multi-user/multi-tenant support, auth, or API surface.
- No horizontal scaling or distributed/shared cache — single container, single process.
- No persistent cache across container restarts (in-memory only).
- No change to portless local dev workflow (still `pnpm dev`).

## Decisions

### D1: Adopt `@astrojs/node` adapter in standalone mode
`output: 'server'` with `node({ mode: 'standalone' })` produces a standalone HTTP server (`dist/server/entry.mjs`) runnable via `node ./dist/server/entry.mjs`, with no Express/Fastify host. Note: "standalone" refers to the server host, not a self-contained bundle — npm dependencies are still externalized, so the runtime image must include `node_modules` (see D4). It respects `HOST`/`PORT` env vars at runtime and serves hashed `/_astro/` assets with `Cache-Control: public, max-age=31536000, immutable` automatically.

- *Alternative considered:* Vercel/Netlify/Cloudflare adapters. Rejected — would force a hosting-platform change; the project deploys to Coolify/Docker.
- *Alternative considered:* `output: 'hybrid'`/per-route prerender. Unneeded — there is only one route and it must always be live.

### D2: Extract calendar logic into `src/lib/calendar.ts` with an in-memory TTL cache
Move the ICS fetch + recurring-event expansion + day-grouping out of the page frontmatter into a module that returns the computed week and caches it. Cache key is the current day in `America/Mexico_City` (the window is a rolling 7 days starting today); TTL is a constant (default 10 min). On hit within TTL, render from cache; on miss/expiry, re-fetch all feeds, recompute, store.

- *Why key by current day:* the cache naturally expires at day rollover (when the window shifts) without extra logic, and each day's window is only ever computed once. The window starts today, not Monday — "today" and the day labels are still derived from `now` at request time so the "Today" highlight is never stale across a day boundary.
- *Why 10 min TTL:* calendar events are not latency-critical; it keeps pages snappy and Google hit-rate at ~144/day max. TTL is a module constant, not env-configurable (YAGNI).
- *Alternative considered:* Astro's built-in `memoryCache()` cache provider. Rejected — it caches `fetch()` calls made through Astro's runtime, but `node-ical.async.fromURL` performs its own internal fetch, so it isn't transparent.
- *Alternative considered:* stale-while-revalidate / serve-stale-on-failure. Rejected for this scale — adds concurrency complexity; a failed fetch can simply skip the feed (existing behavior).

### D3: `CALENDARS` read from `process.env` at request time
In SSR, `process.env.CALENDARS` is evaluated per request. The `import.meta.env.CALENDARS` fallback is dropped for production (it is statically inlined at build time and would silently win); instead, dev keeps a gated fallback — `process.env.CALENDARS ?? (import.meta.env.DEV ? import.meta.env.CALENDARS : undefined)`. Vite's `loadEnv` (which Astro uses) populates `import.meta.env` from `.env` but never writes to `process.env`, so without this the portless `pnpm dev` workflow would render the config-error page. Because `import.meta.env.DEV` is inlined as `false` in production builds, nothing is baked in. Invalid/missing input still renders the friendly config-error page, but now it reflects the runtime env.

### D4: Replace nginx stage with a Node runtime stage in the Dockerfile
The Astro standalone adapter **externalizes npm dependencies** (official deploy recipes ship `dist` + `package.json` + `node_modules` to the runtime), so the runtime image must include a production `node_modules` in addition to the built `dist/`. The runtime stage runs `node:lts-alpine`, copies `dist/` (server + client) and a prod-only `node_modules`, sets `ENV HOST=0.0.0.0` and `ENV PORT=4321`, `EXPOSE 4321`, `CMD ["node", "./dist/server/entry.mjs"]`. `CALENDARS` becomes a runtime env, not a build `ARG`. `nginx.conf` is deleted.

```dockerfile
# syntax=docker/dockerfile:1.7

# === Stage 1: Build ===
FROM node:lts-alpine AS build
RUN npm install -g pnpm@10.18.3
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# === Stage 2: Prod deps (same base image => no native-binary drift) ===
FROM node:lts-alpine AS deps
RUN npm install -g pnpm@10.18.3
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# === Stage 3: Runtime ===
FROM node:lts-alpine AS runtime
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

- *Why a dedicated `deps` stage over copying the build stage's `node_modules`:* the build stage contains dev deps (`@types/node`, build tooling); a prod-only install keeps the image lean while reusing the same `node:lts-alpine` base and frozen lockfile for reproducible deps. Simpler alternative (if the second install causes issues): copy the full build-stage `node_modules` — identical deps, just heavier.
- *Why drop nginx:* the standalone server already applies the immutable asset caching; the Kindle-rendered HTML doesn't benefit from nginx's gzip/security headers enough to justify a second service.
- *Trade-off noted:* no HTTP gzip at the edge. Page is a few KB of plain HTML; acceptable. If it ever matters, add an nginx reverse proxy without changing the app.

### D5: Footer shows "Updated" time
Rename the footer label from "Built" to "Updated" and set it from the cache-fill time (the time the current cache entry was computed), so it reflects the rendered data's freshness, not the deploy.

### D6: Add `start` script and dependencies
`package.json` gains `@astrojs/node` as a dependency and `"start": "node ./dist/server/entry.mjs"`.

### D7: Preserve `Cache-Control: no-cache` on the HTML response
nginx currently sends `Cache-Control: no-cache` on HTML so the aggressively-caching Kindle browser does not serve a stale week; the node standalone server does not add it by default. Set it on the calendar page response — e.g. `Astro.response.headers.set('Cache-Control', 'no-cache')` in the page frontmatter, or an Astro middleware if more routes appear later. Hashed `/_astro/` assets keep the adapter's automatic immutable headers.

## Risks / Trade-offs

- [First request after deploy/restart is slow (all feeds fetched synchronously, ~0.5–2s)] → Mitigation: acceptable for a personal Kindle page; subsequent requests within TTL are instant. Could prefetch on boot later if it matters.
- [Container restart clears the in-memory cache] → Mitigation: same as above; TTL cache is ephemeral by design.
- [Google ICS unavailability at request time renders missing calendars] → Mitigation: per-feed skip preserves the rest (existing behavior); transient Google outages are rare for `ical/basic.ics`.
- [Runtime image missing `node_modules` → `node ./dist/server/entry.mjs` crashes on module resolution (standalone externalizes deps)] → Mitigation: runtime stage copies prod deps from the dedicated `deps` stage (D4); a smoke test of the image in task 5.4 catches it.
- [Multi-process/multi-instance would defeat the in-memory cache] → Mitigation: out of scope — single container, single process (see Non-Goals).
- [`output: 'server'` requires the adapter at build time; forgetting it breaks `pnpm build`] → Mitigation: config change lands together with the adapter install in the same change; CI/build fails loudly if missing.
- [SSR requests bypass the current static `try_files`; any path serves the page] → Mitigation: nginx 404 handling goes away with nginx; single-route app, no deep links to preserve.

## Migration Plan

1. Install `@astrojs/node`; set `output: 'server'` + adapter in `astro.config.mjs`.
2. Extract and cache calendar logic into `src/lib/calendar.ts`; update page frontmatter + footer.
3. Update Dockerfile (node runtime stage, runtime `CALENDARS`), delete `nginx.conf`.
4. Update docs: `README.md`, `docs/astro-docker-deployment.md`.
5. Deploy: in Coolify, move `CALENDARS` from build-time to runtime env; disable the n8n → build-hook cron.
6. Rollback: revert to the last static-image tag (nginx image is immutable and still in the registry) and re-enable the cron — zero code change needed.

## Open Questions

- None blocking. Minor: whether to keep `nginx.conf` in the repo as an optional reverse-proxy reference (decision: delete, it's recoverable from git history).