## ADDED Requirements

### Requirement: Runtime Node server deployment
The Docker image SHALL run the Astro Node standalone server, serving both HTML and hashed assets at request time.

#### Scenario: Container serves the page
- **WHEN** the container starts with `HOST` and `PORT` set
- **THEN** the standalone server listens on that port and serves the calendar page

#### Scenario: Hashed assets are cached immutably
- **WHEN** a browser requests a content-hashed asset under `/_astro/*`
- **THEN** the server responds with an immutable long-lived cache header

### Requirement: Runtime environment configuration
`CALENDARS` SHALL be a runtime environment variable on the deployed container, taking effect on the next request.

#### Scenario: Calendar changed without rebuild
- **WHEN** the `CALENDARS` runtime variable is updated and the container is restarted
- **THEN** the next request renders the updated calendars with no image rebuild

## MODIFIED Requirements

### Requirement: Kindle-friendly static serving
The server SHALL serve the page with caching tuned for the Kindle's aggressive browser cache.

#### Scenario: HTML is not cached
- **WHEN** a browser requests the calendar page
- **THEN** the response carries `Cache-Control: no-cache`

#### Scenario: No PWA required
- **WHEN** the server is configured
- **THEN** no service worker, manifest, or offline fallback is configured

## REMOVED Requirements

### Requirement: Docker image with build-time calendars
**Reason**: Calendars are now fetched and rendered at request time; baking them into the image at build time is no longer needed.

**Migration**: Set `CALENDARS` as a runtime environment variable on the container. Rebuilds are no longer required for calendar changes.

### Requirement: External daily rebuild
**Reason**: The page now reflects the current week on every request, so scheduled rebuilds are obsolete.

**Migration**: Remove the n8n cron job and Coolify build hook. No replacement is needed.