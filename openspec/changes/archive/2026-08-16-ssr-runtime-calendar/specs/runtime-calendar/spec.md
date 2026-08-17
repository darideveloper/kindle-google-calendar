## ADDED Requirements

### Requirement: Request-time week rendering
The weekly calendar page SHALL be server-rendered at request time, computing the rolling 7-day window, "Today" highlight, and day boundaries from the current date in `America/Mexico_City`.

#### Scenario: Page reflects the current week
- **WHEN** a browser requests the page
- **THEN** the response renders a 7-day window starting on the current day, with that day marked as "Today"

#### Scenario: Week rolls over without redeploy
- **WHEN** the day advances (the window shifts forward) while the server keeps running
- **THEN** the next request renders the new window without any rebuild or restart

### Requirement: Runtime calendar configuration
The calendar feeds SHALL be read from the `CALENDARS` environment variable at request time, so configuration changes take effect without a redeploy.

#### Scenario: Valid CALENDARS configured
- **WHEN** `CALENDARS` is a valid JSON array of `{ name, url }` entries in the runtime environment
- **THEN** the page renders events from those feeds

#### Scenario: Missing or invalid CALENDARS
- **WHEN** `CALENDARS` is unset, empty, or not valid JSON at request time
- **THEN** the page renders a friendly "no calendars configured" state explaining the expected value

### Requirement: Cached ICS fetching
The server SHALL cache fetched calendar data in memory, keyed by the current day, for a short TTL so repeated requests within the same window do not re-fetch every ICS feed.

#### Scenario: Repeated request within TTL
- **WHEN** a request arrives while a fresh cache entry for the same window exists
- **THEN** the page is rendered from the cached data without re-fetching the ICS feeds

#### Scenario: Cache expired or window changed
- **WHEN** the cache entry is older than the TTL or belongs to a previous window
- **THEN** the server re-fetches the ICS feeds and refreshes the cache

### Requirement: Graceful calendar failure
The server SHALL tolerate individual ICS feed failures without failing the whole page.

#### Scenario: One feed is unreachable
- **WHEN** one calendar feed fails to fetch or parse while others succeed
- **THEN** the page renders the remaining calendars and does not error

### Requirement: Freshness marker
The page footer SHALL display when the rendered content was last refreshed.

#### Scenario: Footer reflects render time
- **WHEN** a browser loads the page
- **THEN** the footer shows the time the page content was last refreshed in `America/Mexico_City`