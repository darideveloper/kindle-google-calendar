## Context

Astro static site (Astro 7, Node ≥22.12, pnpm) that fetches Google Calendar ICS feeds at **build time** via the `CALENDARS` env var and renders the current week (Mon–Sun, pinned to `America/Mexico_City`) as pure HTML for e-ink Kindle browsers. Output is fully static (`dist/`). There is no `PUBLIC_*` env var, no PWA/service worker, and no `SITE_URL` usage anywhere. Dev currently uses `astro dev` on port 4321; there is no container setup. Deployment target is the user's own Docker host (Coolify); daily freshness is handled externally by an n8n cron that fires a Coolify build hook.

```
DEV (browser)                             PROD (Kindle)
https://kindle-calendar.localhost         n8n cron (daily)
      │ portless (443/1355, PORT env)          │
      ▼                                       ▼
 Astro dev server                       Coolify build hook
   (PORT from env)                            │
                                             ▼
                             ┌───────────────────────────────┐
                             │ stage 1: node:lts-alpine      │
                             │  ARG CALENDARS → pnpm build   │
                             │  (ICS fetched at build time)  │
                             ├───────────────────────────────┤
                             │ stage 2: nginx:alpine         │
                             │  serves dist/, no-cache HTML  │
                             └───────────────────────────────┘
                                             │
                                  Coolify/Traefik TLS → Kindle
```

## Goals / Non-Goals

**Goals:**
- Dev runs at `https://kindle-calendar.localhost` via portless with auto-HTTPS and the ephemeral `PORT` it injects.
- Reproducible two-stage Docker image (node build → nginx serve) with `CALENDARS` as a build-time arg.
- nginx config tuned for the Kindle: `no-cache` on HTML, immutable cache on hashed assets, non-PWA.
- The image is rebuildable on demand by a Coolify build hook (n8n fires it externally) with zero repo-side scheduling code.

**Non-Goals:**
- No `SITE_URL`/canonical/redirect handling — the app has no redirects or canonical links.
- No PWA / service worker / offline support.
- No CI/CD workflow in the repo — n8n + Coolify build hook stays external.
- No runtime env handling for `CALENDARS` — it is build-time only by design.

## Decisions

### 1. Portless dev: `portless kindle-calendar pnpm astro dev`
Wrap the dev script with the project name matching `package.json` (`kindle-calendar`), so the stable URL is `https://kindle-calendar.localhost`. `astro.config.mjs` reads the injected `PORT`:
```js
server: {
  port: process.env.PORT ? parseInt(process.env.PORT) : 4321,
  strictPort: true,
}
```
- `strictPort: true` makes the dev server fail fast instead of silently picking another port.
- Portless is installed globally (already present, v0.10.3); it is **not** a project dependency.
- `.localhost` resolves natively in Chrome/Edge/Firefox; `portless hosts sync` covers Safari/Firefox if needed.
- **Alternatives considered:** hardcoded port per project (rejected: conflicts, no HTTPS), plain `astro dev` (status quo, rejected for port conflicts and lack of stable HTTPS URL).

### 2. Skip `SITE_URL`
The portless doc lists `SITE_URL` for redirects/canonical links. Verified via grep: this project has none. Adding it would be dead config → omitted.

### 3. Two-stage Dockerfile
`node:lts-alpine` (build) → `nginx:alpine` (serve), `EXPOSE 80`. Layer ordering preserves the dependency cache:
```
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile     # cached unless lockfile changes
COPY . .
RUN pnpm build
```
- `pnpm-workspace.yaml` must be copied too: it carries the `allowBuilds` approvals for esbuild/sharp, and `pnpm install --frozen-lockfile` expects the same workspace settings the lockfile was created with. Without it the install can fail or silently drop those build scripts.
- `--frozen-lockfile` fails the build if the lockfile is out of sync with `package.json`.

### 4. pnpm via `npm install -g pnpm@10.18.3` instead of corepack
Corepack availability varies across `node:lts-alpine` tags and is being phased out of newer Node distributions. `npm install -g pnpm@<version>` works uniformly on alpine. The version is pinned to match the `packageManager` field (`pnpm@10.18.3`), keeping a single source of truth.
- **Alternatives considered:** corepack (`RUN corepack enable && corepack prepare pnpm@… --activate`) from the doc template (rejected: availability variance across base-image tags).

### 5. `CALENDARS` as a build-time `ARG`/`ENV`, not `PUBLIC_*`
`src/pages/index.astro:71` reads `process.env.CALENDARS ?? import.meta.env.CALENDARS` at build time. The Dockerfile exposes it as:
```dockerfile
ARG CALENDARS
ENV CALENDARS=$CALENDARS
```
The doc template's `PUBLIC_*` pattern does not apply — this project has no `PUBLIC_*` vars. Builds without `CALENDARS` degrade gracefully to the "no calendars configured" page (handled in code), so a bad webhook can't crash the site.

### 6. nginx.conf — non-PWA variant, Kindle-first caching
- `location /` → `try_files $uri $uri/index.html =404;` with `Cache-Control: no-cache` — the Kindle's browser caches aggressively and otherwise shows a stale week (README requirement).
- `/_astro/*` (and static image/font assets) → immutable 1y cache; Astro content-hashes filenames.
- gzip + standard security headers retained.
- **All PWA blocks removed** (offline `error_page`, service worker, manifest) — the app has none.

### 7. External daily rebuild via Coolify build hook
n8n posts to the Coolify build hook on a schedule; Coolify re-applies the stored build-time `CALENDARS` arg and rebuilds the image. No scheduling code in the repo; the README documents the mechanism.

## Risks / Trade-offs

- **Build-time ICS fetch needs outbound network** → The `pnpm build` step fetches Google Calendar ICS feeds. On a restricted/sandboxed build network the build degrades to the "no calendars configured" page or fails. Mitigation: document that the build stage requires outbound HTTPS to `calendar.google.com`.
- **Stale week if rebuild misses** → The current week is pinned at build time. If the n8n cron or Coolify hook fails, the page keeps showing the old week (HTML is served with `no-cache`, so nothing is cached away — the page is just old). Mitigation: README documents the webhook dependency; failure mode is visible, not silent data loss.
- **Secret in build arg** → `CALENDARS` URLs contain private ICS IDs and are baked into the image. They are passed as a Coolify build-time env var, not committed. Mitigation: `.dockerignore` excludes `.env`/`.env.*`; keep the value in Coolify's secrets store.
- **Portless is local-only** → The Kindle cannot use the portless CA/certs; production must come from the deployed Docker image. Mitigation: separate dev (portless) from prod (Docker) is by design and documented.