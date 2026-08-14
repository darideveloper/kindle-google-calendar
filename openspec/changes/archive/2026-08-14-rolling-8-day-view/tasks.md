## 1. Window computation

- [x] 1.1 In `src/pages/index.astro` frontmatter, remove the Monday-origin helpers `weekdayMap`, `weekdayFmt`, `mondayBack`, and `mondayWall`
- [x] 1.2 Set `start = wallToDate(todayParts.year, todayParts.month, todayParts.day)` (midnight today in TZ)
- [x] 1.3 Set the expansion boundary `end = start + 8 * 86400000`

## 2. Event expansion

- [x] 2.1 Update `ical.expandRecurringEvent(ev, { from: start, to: end, expandOngoing: true })` to use the new window values

## 3. Day sections

- [x] 3.1 Change the day loop from `d < 7` to `d < 8` so today + next 7 days render

## 4. Labels

- [x] 4.1 Change `<title>` to "Next 8 Days"
- [x] 4.2 Change `<h1>` to "Next 8 Days — {weekLabel}"

## 5. Verification

- [x] 5.1 Run `pnpm build` and confirm it succeeds
- [x] 5.2 Inspect the built output to confirm today appears first followed by the next 7 days, with correct title