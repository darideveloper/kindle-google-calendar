# Kindle Calendar

Static weekly calendar page for e-ink Kindle browsers. Fetches your Google
Calendar ICS feeds at build time and renders the current week (Mon–Sun) as
pure HTML — no JavaScript, grayscale, block layout for old WebKit.

## Setup

1. Install: `pnpm install` (requires Node >= 22.12)
2. Add your calendars:

```sh
cp src/calendars.example.json src/calendars.json
```

Then paste your private Google Calendar ICS links into `src/calendars.json`.
Each entry is one calendar; the array order maps to the gray left-border
shades. `src/calendars.json` is gitignored — only the example is committed.

## Build

```sh
pnpm build
```

Output goes to `dist/index.html`. Build without `src/calendars.json` renders
a friendly "no calendars configured" page.

The week window, "Today" highlight, and day boundaries are pinned to
`America/Mexico_City` (the `TZ` constant in `src/pages/index.astro`).

## Hosting

- Serve `dist/` anywhere.
- Send `Cache-Control: no-cache` — old Kindle browsers cache aggressively and
  will otherwise show a stale week.
- Open the URL in the Kindle's Experimental Browser.

## Daily auto-rebuild

Regenerate each day (e.g. cron/systemd timer) with:

```sh
pnpm install --frozen-lockfile
pnpm build
```

The current week is derived from the build time, so a daily rebuild keeps the
page fresh.
