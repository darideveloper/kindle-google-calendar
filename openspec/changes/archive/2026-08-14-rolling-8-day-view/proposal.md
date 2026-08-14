## Why

The Kindle calendar renders a fixed Monday→Sunday week, so "today" can sit buried mid-list when built mid-week. The reader must scan past earlier days to find what matters. Show today as the first (top) section followed by the next 7 days: a rolling 8-day window anchored on today.

## What Changes

- The calendar window starts at **today** (midnight, `America/Mexico_City`) instead of the current week's Monday.
- The page renders **8 day sections**: today + the following 7 days.
- Page `<title>` and `<h1>` change from "This Week" to "Next 8 Days".
- Remove now-dead Monday-computation code (`weekdayMap`, `weekdayFmt`, `mondayBack`, `mondayWall`).
- No change to event fetching, the recurring-expansion mechanism (`expandOngoing`), styling, or the "Today" highlight logic — the expansion window's `from`/`to` bounds move with the new origin (today always lands on section 0).

## Capabilities

### New Capabilities

- `rolling-8-day-view`: A rolling 8-day calendar view anchored on today, rendering today first followed by the next 7 days, with an updated page title.

### Modified Capabilities

<!-- None; no existing specs under openspec/specs/ and no spec-level requirement changes to prior capabilities. -->

## Impact

- Single file: `src/pages/index.astro`.
- No new dependencies.
- Static build output; `now` is captured once at build time (existing behavior).
- DST-safe: `America/Mexico_City` abolished DST (2022), so fixed `86400000` day arithmetic is valid.