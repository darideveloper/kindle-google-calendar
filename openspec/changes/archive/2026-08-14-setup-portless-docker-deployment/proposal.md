## Why

The production target is the user's own Docker host (Coolify/NAS/VPS), but the repo has no container setup — no `Dockerfile`, no `nginx.conf`, no `.dockerignore`. Dev runs plain `astro dev` on a hardcoded port 4321 with no production-like HTTPS or stable URL. The templates in `docs/astro-portless.md` and `docs/astro-docker-deployment.md` are unapplied and assume things that don't match this project (`PUBLIC_*` env vars, corepack, PWA blocks, `SITE_URL`). Without a deployable image, the n8n daily rebuild has nothing to rebuild, and the Kindle's week would go stale.

## What Changes

- **Dev** (`package.json` + `astro.config.mjs`): wrap `dev` in `portless kindle-calendar` and read the injected ephemeral `PORT` env var, so the site runs at `https://kindle-calendar.localhost` with auto-HTTPS and fails fast on port conflicts.
- **Dockerfile** (new): two-stage build — `node:lts-alpine` builds `dist/`, `nginx:alpine` serves it. `CALENDARS` is passed as a build-time `ARG`/`ENV` (not `PUBLIC_*`, which this project doesn't use).
- **nginx.conf** (new): non-PWA server config tuned for the Kindle — `no-cache` on HTML, immutable cache on hashed `/_astro/*` assets, gzip, security headers.
- **.dockerignore** (new): excludes build output, deps, env, and docs.
- **`packageManager`** field added to `package.json` and pnpm pinned consistently for Docker installs.
- **README**: document the portless dev command, Docker build/run, and the n8n→Coolify build-hook daily rebuild.

## Capabilities

### New Capabilities
- `dev-and-deploy`: covers the portless dev workflow, the Dockerized build/serve pipeline, Kindle-friendly caching, and external daily rebuild via a Coolify build hook.

### Modified Capabilities
<!-- None — openspec/specs/ contains no existing specs. -->

## Impact

- **Files**: `package.json`, `astro.config.mjs`, `README.md` (modified); `Dockerfile`, `nginx.conf`, `.dockerignore` (added).
- **Dependencies**: pnpm pinned via `packageManager`; no new runtime deps.
- **Env vars**: `CALENDARS` becomes a build-time Docker arg (already build-time in local dev); no `PUBLIC_*` vars.
- **Deployment**: image must be rebuilt daily (external n8n → Coolify webhook) because the current week is baked in at build time.
- **Non-goals**: no `SITE_URL`/canonical/redirect handling (unused), no PWA/service worker, no CI/CD in the repo, no runtime env handling for `CALENDARS`.
