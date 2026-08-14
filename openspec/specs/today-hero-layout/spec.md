# today-hero-layout Specification

## Purpose

Define the compact hero-plus-grid layout for the Kindle calendar: a full-width "Today" hero section followed by a 3-column × 2-row grid of the next six days, using the full screen width with truncated one-line events and a non-overlapping "All day" label.
## Requirements
### Requirement: Today renders as a full-width hero section
The calendar SHALL render the current day (in `America/Mexico_City`) as the first section, spanning the full content width, and display all of today's events using the existing agenda detail format (all-day first, then by start time; time, title, and calendar name per event).

#### Scenario: Build happens on a day with events
- **WHEN** the page is built
- **THEN** the first section is today, labeled with today's date and marked "Today", and it spans the full content width

#### Scenario: Today has all-day and timed events
- **WHEN** today contains both all-day and timed events
- **THEN** all-day events are listed first, followed by timed events sorted by start time

### Requirement: Next six days render as a compact 3×2 grid
The calendar SHALL render the 6 days following today as a compact grid of 3 columns × 2 rows below the hero section, each cell listing its events as single lines with `HH:MM Title` formatting (all-day events as a bold title only), truncating titles that exceed the cell width instead of wrapping, and omitting the calendar-name line.

#### Scenario: A following day has events
- **WHEN** a day in the grid has timed events
- **THEN** each event is shown on one line as time + title, and long titles are truncated rather than wrapped

#### Scenario: A following day has an all-day event
- **WHEN** a day in the grid has an all-day event
- **THEN** it is shown as a bold title with no time prefix

#### Scenario: A following day has no events
- **WHEN** a day in the grid has no events
- **THEN** the cell renders empty (no "free" filler text)

#### Scenario: Six days layout
- **WHEN** the page is built
- **THEN** the grid contains 6 cells arranged in 3 columns × 2 rows

### Requirement: Page uses the full content width
The page SHALL NOT impose a fixed `max-width` body cap smaller than the viewport, so content (hero section and strip) fills the available Kindle screen width.

#### Scenario: Wide-screen Kindle
- **WHEN** the page is rendered on a screen wider than 600 CSS pixels
- **THEN** the hero section and the strip columns expand to use the full available width

### Requirement: All-day label does not overlap the title
The "All day" label SHALL occupy a fixed-width slot separate from the event title so the two never overlap or run together.

#### Scenario: Event renders as all-day
- **WHEN** an all-day event is rendered in the hero section
- **THEN** the "All day" label and the event title render on the same line without overlapping, with the label aligned to the same column as timed event times

