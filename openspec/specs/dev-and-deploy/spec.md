## Purpose

Define the development and deployment workflow for the Kindle calendar: the portless dev server, the Docker image with build-time calendars, Kindle-friendly static serving, and the external daily rebuild.

## Requirements

### Requirement: Portless dev workflow
The dev server SHALL run at `https://kindle-calendar.localhost` via portless, listening on the ephemeral port that portless injects via the `PORT` environment variable.

#### Scenario: Dev server starts under portless
- **WHEN** the developer runs `pnpm dev` with portless installed and the route registered
- **THEN** the site is served with HTTPS at `https://kindle-calendar.localhost`

#### Scenario: Fallback when portless is absent
- **WHEN** `pnpm dev` runs outside portless so `PORT` is unset
- **THEN** the dev server listens on the default port 4321

#### Scenario: Assigned port is already in use
- **WHEN** portless injects a `PORT` value that is already taken by another process
- **THEN** the dev server fails fast with an error instead of silently choosing a different port

### Requirement: Docker image with build-time calendars
The Docker image SHALL build the current week's calendar from the `CALENDARS` environment variable at build time and serve the result as a static site.

#### Scenario: Build with CALENDARS set
- **WHEN** the image is built with the `CALENDARS` build arg containing valid `{ name, url }` entries
- **THEN** the resulting static page renders those calendars for the current week

#### Scenario: Build without CALENDARS set
- **WHEN** the image is built without a `CALENDARS` value
- **THEN** the build completes and the page renders a friendly "no calendars configured" state instead of failing

### Requirement: Kindle-friendly static serving
The nginx server SHALL serve the static output with caching tuned for the Kindle's aggressive browser cache.

#### Scenario: HTML is not cached
- **WHEN** a browser requests any HTML page
- **THEN** the response carries `Cache-Control: no-cache`

#### Scenario: Hashed assets are cached immutably
- **WHEN** a browser requests a content-hashed asset under `/_astro/*`
- **THEN** the response carries an immutable long-lived cache header

#### Scenario: No PWA required
- **WHEN** the server is configured
- **THEN** no service worker, manifest, or offline fallback is configured

### Requirement: External daily rebuild
The image SHALL be rebuildable on demand via a Coolify build hook so an external n8n cron can refresh the current week without repo changes.

#### Scenario: Rebuild triggered by build hook
- **WHEN** the Coolify build hook is fired by the external n8n cron
- **THEN** Coolify rebuilds the image using the stored build-time `CALENDARS` value and the resulting page shows the current week