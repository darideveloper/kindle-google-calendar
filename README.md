# Kindle Calendar

Server-rendered weekly calendar page for e-ink Kindle browsers. Fetches your
Google Calendar ICS feeds **at request time** and renders a rolling 7-day
window (starting today) as pure HTML — no JavaScript, grayscale, block layout
for old WebKit. No rebuild needed to keep the data fresh.

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

> `CALENDARS` is read at **request time** from `process.env`, so configuration
> changes take effect by restarting the server — no rebuild. In dev (`pnpm dev`)
> the value comes from `.env` via `import.meta.env`; in production set it in the
> runtime environment.

## Build & run

```sh
pnpm build
pnpm start    # node ./dist/server/entry.mjs
```

`pnpm build` emits a standalone server at `dist/server/entry.mjs` plus static
assets in `dist/client/`. Running without `CALENDARS` set renders a friendly
"no calendars configured" page.

Calendar data is cached in memory for 10 minutes (keyed by the current day), so
repeated requests don't re-fetch every ICS feed; the footer shows when content
was last refreshed. The window, "Today" highlight, and day boundaries are
pinned to `America/Mexico_City` (the `TZ` constant in `src/lib/calendar.ts`).

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

Build the image and run it with `CALENDARS` as a **runtime** environment
variable:

```sh
docker build -t kindle-calendar:latest .
docker run -d \
  -e "CALENDARS=[{\"name\":\"Work\",\"url\":\"https://.../basic.ics\"}]" \
  -p 8080:4321 \
  kindle-calendar:latest
```

- Three-stage build: `node:lts-alpine` builds the SSR output, a `deps` stage
  installs production dependencies only, and a `runtime` stage runs the
  standalone server (`node ./dist/server/entry.mjs`). `CALENDARS` is **not** a
  build arg — set it as a runtime env var.
- The server listens on port `4321` by default (`HOST`/`PORT` env vars).
- HTML is served with `Cache-Control: no-cache` (Kindle browsers cache
  aggressively); hashed `/_astro/*` assets get an immutable 1-year cache.
- The server fetches Google Calendar ICS feeds on demand, so it needs outbound
  HTTPS.

## Hosting (Coolify / any Docker host)

- Point Coolify at the Git repo with build pack **Dockerfile**.
- Set `CALENDARS` as a **runtime** environment variable (not build-time) so
  calendar changes take effect by editing the env and restarting the app — no
  rebuild, no redeploy.
- No scheduled rebuilds are needed: the page always reflects the current
  window at request time.
- Open the URL in the Kindle's Experimental Browser.