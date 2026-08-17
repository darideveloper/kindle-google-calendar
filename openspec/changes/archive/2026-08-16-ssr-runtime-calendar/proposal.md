## Why

The calendar is currently built as a static site at build time, so the week shown is frozen until the image is rebuilt. Keeping it fresh requires a fragile external n8n → Coolify build-hook cron and a redeploy every day. Rendering server-side at request time removes the rebuild entirely: the page always reflects the current week and any `CALENDARS` change takes effect on the next request, with no deploy.

## What Changes

- Enable SSR via the `@astrojs/node` adapter (`output: 'server'`, standalone mode), producing a long-running Node server instead of a static `dist/`.
- Fetch and render ICS calendar data **at request time** instead of build time, so the week, "Today" highlight, and day boundaries always use the current date in `America/Mexico_City`.
- Add an in-memory TTL cache (keyed by week start) so repeated requests don't re-fetch every ICS feed, keeping page loads fast and Google hits low.
- Read `CALENDARS` from the **runtime** environment (`process.env`) so changing calendars or adding a feed requires only an env update, not a rebuild.
- Replace the nginx serving stage in the Docker image with a Node runtime stage running the standalone server (`node ./dist/server/entry.mjs`).
- Remove the external daily-rebuild workflow (n8n → Coolify build hook) — no longer needed.
- Update the footer to show when the page content was last refreshed rather than when the site was built.
- Preserve `Cache-Control: no-cache` on the HTML response so the aggressively-caching Kindle browser never serves a stale week.
- **BREAKING**: `CALENDARS` becomes a runtime environment variable in deployment; build-time-only config (Docker `ARG`/`ENV CALENDARS`) no longer applies.
- **BREAKING**: The container now runs a Node server on port 4321 (configurable via `PORT`) instead of nginx on port 80.

## Capabilities

### New Capabilities
- `runtime-calendar`: Server-side rendering of the weekly calendar from live ICS feeds, including runtime env config, request-time week computation, and in-memory caching.

### Modified Capabilities
- `dev-and-deploy`: The deployment model changes from a static build served by nginx to a runtime Node server; `CALENDARS` moves from build-time to runtime; the external daily rebuild requirement is removed.

## Impact

- `src/pages/index.astro` — frontmatter now runs at request time; env read and error state updated; sets `Cache-Control: no-cache` on the HTML response (nginx's former job); footer label changes from "Built" to "Updated".
- `src/lib/calendar.ts` — new module extracting the ICS fetch + week computation from the page, with TTL caching.
- `astro.config.mjs` — add `output: 'server'` and the Node adapter (standalone mode).
- `package.json` — new dependency `@astrojs/node`; new `start` script to run the built server.
- `Dockerfile` — build stage becomes a 3-stage build: build + prod-deps (`pnpm install --prod`) + runtime running `node ./dist/server/entry.mjs` with `HOST`/`PORT` env; runtime stage must include `node_modules` (the standalone server externalizes dependencies); `CALENDARS` no longer a build ARG.
- `nginx.conf` — deleted (no longer used; recoverable from git history if a reverse proxy is ever wanted).
- `README.md`, `docs/astro-docker-deployment.md` — document runtime env, Node deployment, and removal of the daily rebuild.
- `openspec/specs/dev-and-deploy/spec.md` — requirements rewritten for the runtime model.
- Deploy (Coolify): `CALENDARS` moved from build-time to runtime env vars; no more n8n cron.