## ADDED Requirements

### Requirement: Rolling 8-day window anchored on today
The calendar SHALL render exactly 8 day sections, with the current day (in `America/Mexico_City`) as the first/top section followed by the next 7 days. The window origin SHALL be midnight today in the target timezone.

#### Scenario: Build happens mid-week
- **WHEN** the page is built on a day that is not Monday
- **THEN** the first section is that day, labeled with today's date and marked "Today", and the following 7 sections are the subsequent 7 days

#### Scenario: Build happens on Monday
- **WHEN** the page is built on a Monday
- **THEN** the first section is that Monday and the last section is the following Monday — 8 sections covering today plus the next 7 days

### Requirement: Recurring and ongoing events expand across the rolling window
The recurring-event expansion window SHALL cover today through the end of the 8th day so that events in any rendered section appear, including ongoing multi-day events that started before the window.

#### Scenario: Daily recurring event
- **WHEN** a daily recurring event exists and the window is today + 7 days
- **THEN** an instance is listed in each of the 8 sections

#### Scenario: Multi-day event spans the window boundary
- **WHEN** a multi-day event started before today and ends within the window
- **THEN** the event appears in every section it overlaps, and is listed on today's section even though it started before the window

### Requirement: Page title reflects the rolling view
The page `<title>` and main heading SHALL read "Next 8 Days" instead of "This Week".

#### Scenario: Rendered page
- **WHEN** the page is built
- **THEN** the `<title>` is "Next 8 Days" and the `<h1>` reads "Next 8 Days — <date range of the 8-day window>"

### Requirement: Dead Monday-computation code removed
The Monday-origin computation (`weekdayMap`, `weekdayFmt`, `mondayBack`, `mondayWall`) SHALL be removed from the page's frontmatter.

#### Scenario: Source inspection
- **WHEN** the frontmatter of `src/pages/index.astro` is inspected
- **THEN** no Monday-anchored week-start computation remains