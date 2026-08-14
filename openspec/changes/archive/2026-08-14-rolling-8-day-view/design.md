## Context

Single-file static Astro page (`src/pages/index.astro`) that fetches iCal calendars via `node-ical`, expands recurring events, and renders one section per day. The current window is anchored on the current week's Monday (`weekStart`) with `expandRecurringEvent({ from: weekStart, to: weekStart + 7d })` and renders `d < 7` sections. Today is only highlighted, not ordered first.

Constraints: `America/Mexico_City` timezone; static build captures `now` once; no DST since 2022.

## Goals / Non-Goals

**Goals:**
- Today renders as the first/top section, followed by the next 7 days (8 total).
- Minimal diff confined to `src/pages/index.astro`.
- Preserve existing event expansion and day-assignment behavior.

**Non-Goals:**
- No styling changes, no timezone changes, no changes to event fetching.
- No change to how "Today" is highlighted (it now simply always matches section 0).
- No client-side behavior (page remains a static snapshot).

## Decisions

### 1. Window origin: midnight today instead of Monday
Replace the Monday-relative computation with:

```
start = wallToDate(todayParts.year, todayParts.month, todayParts.day)
end   = start + 8 * 86400000
```

- `todayParts` is already computed (`zonedParts(now)`) and `wallToDate` already handles the TZ wall-clock → instant conversion, so no new date logic is introduced.
- Alternative considered: deriving `start` from `now` and subtracting the time component. Rejected — `wallToDate` is the established, TZ-correct pattern in this file.
- The Monday helpers (`weekdayMap`, `weekdayFmt`, `mondayBack`, `mondayWall`) become dead code and are removed.

### 2. Expansion window stays exclusive, one day past the last shown day
`end = start + 8 * 86400000` keeps the existing convention: `from = midnight of first shown day`, `to = midnight after the last shown day`, render loop `d < 8`. This guarantees all events on the 8th day are included.

### 3. Title/heading wording
`<title>Next 8 Days</title>` and `<h1>Next 8 Days — {weekLabel}</h1>`. `weekLabel` math (`end - 1` = last shown day) remains valid with the new bounds.

### 4. Keep day-to-event assignment unchanged
The key-comparison loop (startKey/endKey vs each day's key) already handles multi-day events and needs no modification.

## Risks / Trade-offs

- [Fixed 86400000 day arithmetic assumes no DST] → Valid for `America/Mexico_City` (DST abolished 2022); if the TZ ever changes, revisit with calendar-aware date math.
- [Page is a build-time snapshot, so "today" is the build day] → Consistent with existing behavior; the Kindle refresh cadence defines freshness.
- ["This Week"→"Next 8 Days" loses the week framing] → Accepted: it is now a rolling window, and the `<h1>` still shows the covered date range.