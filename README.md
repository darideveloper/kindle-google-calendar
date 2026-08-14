# Kindle Calendar

Static weekly calendar page for e-ink Kindle browsers. Fetches your Google
Calendar ICS feeds at build time and renders the current week (Mon–Sun) as
pure HTML — no JavaScript, grayscale, block layout for old WebKit.

## Setup

1. Install: `pnpm install` (requires Node >= 22.12)
2. Install portless globally: `npm install -g portless` (dev workflow only)
3. Add your calendars:

```sh
cp .env.example .env
```

Then edit `.env` and paste your private Google Calendar ICS links into the
`CALENDARS` variable — a JSON array of `{ "name", "url" }` objects. The array
order maps to the gray left-border shades (first calendar = darkest). Keep the
value on a **single line**. All `.env*` files are gitignored; only
`.env.example` is committed.

> Local env precedence (Vite): real shell env > `.env.production` > `.env` >
> `.env.local`. Use only one local file — a stale `CALENDARS` in
> `.env.production` would silently win over `.env`.

## Build

```sh
pnpm build
```

Output goes to `dist/index.html`. Build without `CALENDARS` set renders a
friendly "no calendars configured" page.

The week window, "Today" highlight, and day boundaries are pinned to
`America/Mexico_City` (the `TZ` constant in `src/pages/index.astro`).

## Dev (portless)

The `dev` script runs through portless, so the site is served over HTTPS at a
stable URL instead of a hardcoded port:

```sh
pnpm dev        # https://kindle-calendar.localhost (port 443, or 1355 if privileged)
```

- Portless injects an ephemeral `PORT` env var; `astro.config.mjs` reads it
  (`strictPort: true` fails fast on conflicts, fallback `4321` outside portless).
- `.localhost` resolves natively in Chrome, Edge, and Firefox. For Safari/Firefox
  hosts issues, run `portless hosts sync`.
- Stop: `portless stop kindle-calendar` · Status: `portless status`.
- Portless is a global tool — it is **not** a project dependency.

## Docker deployment

Build the image with `CALENDARS` as a **build-time** arg:

```sh
docker build \
  --build-arg "CALENDARS=[{\"name\":\"Work\",\"url\":\"https://.../basic.ics\"}]" \
  -t kindle-calendar:latest .
```

Run it:

```sh
docker run -d -p 8080:80 kindle-calendar:latest
```

- Two-stage build: `node:lts-alpine` builds `dist/`, `nginx:alpine` serves it.
- HTML is served with `Cache-Control: no-cache` (Kindle browsers cache
  aggressively); hashed `/_astro/*` assets get an immutable 1-year cache.
- The build stage fetches Google Calendar ICS feeds, so it needs outbound HTTPS.

## Daily auto-rebuild

The current week is baked in at **build time**, so the container must be
rebuilt daily to stay fresh. With Coolify, set an n8n cron job that fires the
Coolify **build hook** on a schedule — Coolify rebuilds the image using the
`CALENDARS` value stored as a build-time env var. No scheduling code lives in
the repo; it is purely external (n8n → Coolify webhook).

`CALENDARS` is read at **build time**, so it must be present in the
environment where `pnpm build` runs. For container deploys (Coolify /
docker-compose), set it as a **build-time** env var, not runtime-only — a
runtime-only var produces the "no calendars configured" page. Locally it comes
from `.env`.

## Hosting

- Serve `dist/` anywhere (or the Docker image — see above).
- Send `Cache-Control: no-cache` — old Kindle browsers cache aggressively and
  will otherwise show a stale week.
- Open the URL in the Kindle's Experimental Browser.
