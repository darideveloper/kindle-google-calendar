# Kindle Calendar

Static weekly calendar page for e-ink Kindle browsers. Fetches your Google
Calendar ICS feeds at build time and renders the current week (Mon–Sun) as
pure HTML — no JavaScript, grayscale, block layout for old WebKit.

## Setup

1. Install: `pnpm install` (requires Node >= 22.12)
2. Add your calendars:

```sh
cp .env.example .env
```

Then edit `.env` and paste your private Google Calendar ICS links into the
`CALENDARS` variable — a JSON array of `{ "name", "url" }` objects. The array
order maps to the gray left-border shades (first calendar = darkest). Both
`.env` and `.env.production` are gitignored; only `.env.example` is committed.

## Build

```sh
pnpm build
```

Output goes to `dist/index.html`. Build without `CALENDARS` set renders a
friendly "no calendars configured" page.

The week window, "Today" highlight, and day boundaries are pinned to
`America/Mexico_City` (the `TZ` constant in `src/pages/index.astro`).

## Hosting

- Serve `dist/` anywhere.
- Send `Cache-Control: no-cache` — old Kindle browsers cache aggressively and
  will otherwise show a stale week.
- Open the URL in the Kindle's Experimental Browser.

## Daily auto-rebuild

Regenerate each day (e.g. cron/systemd timer, or your n8n schedule) with:

```sh
pnpm install --frozen-lockfile
pnpm build
```

`CALENDARS` must be present in the environment where the build runs (locally
via `.env`, or set in your deploy platform / Coolify). The current week is
derived from the build time, so a daily rebuild keeps the page fresh.
