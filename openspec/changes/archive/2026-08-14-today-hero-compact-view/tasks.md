## 1. Frontmatter: window and title

- [x] 1.1 Shrink the window: `end = start + 8 * 86400000` → `start + 7 * 86400000`
- [x] 1.2 Render 7 sections: day loop `d < 8` → `d < 7`
- [x] 1.3 Update `<title>` and `<h1>` wording: "Next 8 Days" → "Next 7 Days" (keep `weekLabel`)

## 2. Markup: hero + 3×2 grid render

- [x] 2.1 Render `days[0]` as the hero `<section>` with the existing per-event detail (`.time`/`.allday`, `.title`, `.cal`, shade)
- [x] 2.2 Add a `<section class="strip">` rendering `days.slice(1, 7)` chunked into 2 rows of 3 (`stripRows` → `div.dayrow` → `div.daycol`)
- [x] 2.3 Grid cells: one line per event as `HH:MM Title` (reusing `timeFmt`); all-day events as bold title only
- [x] 2.4 Grid cells: omit the `.cal` calendar-name line and the "free" filler for empty days

## 3. CSS: layout, width, and all-day fix

- [x] 3.1 Remove the `max-width: 600px` cap on `body` (keep `margin: 0 auto; padding: 16px`)
- [x] 3.2 Add `.dayrow` (`white-space: nowrap`) and `.daycol` styles: `inline-block; vertical-align: top; width: 33.33%; box-sizing: border-box; padding-right: 12px`
- [x] 3.3 Add grid event-line truncation: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- [x] 3.4 Fix `.allday`: add `display: inline-block; min-width: 52px; white-space: nowrap` to match `.time`

## 4. Verify

- [x] 4.1 `pnpm build` succeeds and produces `dist/index.html`
- [x] 4.2 Confirm rendered output: hero = today full-width; grid = 3 columns × 2 rows for the next 6 days; no all-day label overlap; no 600px cap