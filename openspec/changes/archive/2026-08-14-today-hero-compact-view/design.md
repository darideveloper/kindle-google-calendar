## Context

Single-file static Astro page (`src/pages/index.astro`) fetches iCal calendars via `node-ical`, expands recurring events over a rolling window, and renders day sections as pure HTML for the Kindle's old WebKit browser (grayscale, no JS, block layout). Today the page renders 8 day-sections as a vertical list capped at `max-width: 600px`. On the Kindle this shows roughly one day per screen (today's 7+ events fill the viewport) while the right side stays empty on wider screens.

The current event markup uses a `.time` span (inline-block, min-width 52px) for timed events but a plain-inline `.allday` span for all-day events — on the Kindle the "All day" label runs into the title.

## Goals / Non-Goals

**Goals:**
- Today as a full-width hero section, followed by a compact 3×2 grid (3 columns × 2 rows) of the next 6 days (7 sections total).
- Full-width layout (remove the 600px cap).
- Fix the all-day label/title overlap.
- Compact grid cells: one line per event, truncated titles, no calendar-name line, no "free" filler.
- Minimal, old-WebKit-safe CSS (inline-block, no flex/grid), confined to `src/pages/index.astro`.

**Non-Goals:**
- No change to event fetching, recurring expansion, timezone handling, or build/deploy pipeline.
- No client-side behavior (page remains a static snapshot).
- No multi-day spanning visuals (multi-day events still appear in each day they overlap, as today).
- No configurable day counts or a settings UI.

## Decisions

### 1. Window shrinks from 8 days to 7 days
`end = start + 8 * 86400000` becomes `start + 7 * 86400000`; the day loop renders `d < 7`. This shrinks the ICS expansion window and build work, and is the minimal change consistent with "today hero + next 6 days". Alternative considered: keep the 8-day fetch but render only 7 — rejected, it wastes build work and keeps dead window.

### 2. Two-zone render: hero + grid
- `days[0]` renders as the hero `<section>` reusing the existing agenda markup (all-day first, sorted by time, `.time`/`.allday` + `.title` + `.cal`).
- `days.slice(1, 7)` render inside a `<section class="strip">`, chunked into 2 rows of 3 (`stripRows`), each row a `div.dayrow` containing three `div.daycol` cells.
- Alternative considered: a symmetric 4-column or single-row layout — rejected because the user asked for a 3-column grid, and a 3×2 grid keeps cells readable on the Kindle width.

### 3. Grid cells use inline-block rows
Each `.dayrow` uses `white-space: nowrap`; each `.daycol` is `display: inline-block; vertical-align: top; width: 33.33%; box-sizing: border-box; padding-right: 12px; white-space: normal`. This works on old Kindle WebKit without flex/grid. Alternative considered: CSS grid — rejected for old-WebKit compatibility.

### 4. Event lines truncate instead of wrapping
Each grid event line uses `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Kindle WebKit may clip without the ellipsis glyph — acceptable fallback. Grid events render `HH:MM Title` (reusing `timeFmt`); all-day grid events render bold title only.

### 5. Full width via removing the cap
`body { max-width: 600px }` is removed (kept: `margin: 0 auto; padding: 16px`). On 600px-wide devices behavior is unchanged; on wider screens content expands. No media queries — Kindle viewport reporting is unreliable.

### 6. All-day label gets a fixed slot
`.allday` becomes `display: inline-block; min-width: 52px; white-space: nowrap` to mirror `.time`, so the label occupies its own column and never overlaps the title.

### 7. Title wording
`<title>` and `<h1>` change from "Next 8 Days" to "Next 7 Days"; `weekLabel` math (`end - 1` = last shown day) remains valid with the new bounds.

## Risks / Trade-offs

- [Fixed `86400000` day arithmetic assumes no DST] → Valid for `America/Mexico_City` (DST abolished 2022); revisit if the TZ ever changes.
- [Page is a build-time snapshot, so "today" is the build day] → Consistent with existing behavior; the Kindle refresh cadence defines freshness.
- [3 fixed columns on a 600px-wide Kindle leave ~180px per cell, truncating longer titles] → Accepted; truncation is the explicit trade for density, and today's detail lives in the hero.
- [`text-overflow: ellipsis` may not render on very old Kindle WebKit] → Titles clip cleanly instead of wrapping; acceptable fallback.
- [Dropping "free" filler and calendar names in the grid loses some info] → Border-shade still encodes the calendar in the grid; empty cells read as free.