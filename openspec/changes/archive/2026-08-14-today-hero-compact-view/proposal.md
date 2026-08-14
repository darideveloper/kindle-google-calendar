## Why

The current calendar renders 8 day-sections as a single vertical list. On the Kindle e-ink screen, each event takes up to 3 lines, so today's section (often 7+ events) fills the entire screen and the next day barely peeks over the fold. Meanwhile the body is capped at `max-width: 600px`, leaving most of the horizontal space on wider Kindle screens empty. The page shows too little content per screen.

## What Changes

- Replace the 8-section vertical agenda with a **"today hero + compact week"** layout: today renders as a full-width hero section at the top, and the **next 6 days** render as a compact **3×2 grid** (3 columns × 2 rows) below it.
- Shrink the rolling window from 8 days to **7 days** (today + next 6), shrinking the recurring-event expansion window, the build work, the `<title>`, and the `<h1>` ("Next 8 Days" → "Next 7 Days").
- Remove the `max-width: 600px` body cap so content uses the full Kindle width.
- Fix the **"All day" label overlapping** the event title by giving `.allday` the same `inline-block` + `min-width` treatment as `.time`.
- Compact grid cells render one line per event (`HH:MM Title`), truncate long titles instead of wrapping, and drop the `.cal` calendar-name line and `free` filler.
- The hero section keeps the existing event detail (time/all-day, title, calendar name, calendar shade).

## Capabilities

### New Capabilities
- `today-hero-layout`: Renders today as a full-width hero section followed by a compact 3×2 grid (3 columns × 2 rows) of the next 6 days, using the full Kindle width, with one-line truncated events in the grid and a non-overlapping "All day" label.

### Modified Capabilities
- `rolling-8-day-view`: The rolling window changes from 8 days (today + next 7) to 7 days (today + next 6), and the `<title>`/`<h1>` wording changes from "Next 8 Days" to "Next 7 Days".

## Impact

- `src/pages/index.astro`: frontmatter (window constants, day array, title strings) and the render markup (hero section + grid rows/cells) plus `<style>` (width cap removal, `.allday` fix, `.strip`/`.dayrow`/`.daycol` cells, truncation).
- Spec delta for `openspec/specs/rolling-8-day-view/spec.md`; new spec `openspec/specs/today-hero-layout/spec.md`.
- No new dependencies. No change to event fetching, timezone handling, or the build/deploy pipeline.