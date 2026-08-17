## 1. Enable SSR

- [x] 1.1 Install `@astrojs/node` as a dependency (`pnpm add @astrojs/node`)
- [x] 1.2 Update `astro.config.mjs`: add `output: 'server'` and `node({ mode: 'standalone' })` adapter
- [x] 1.3 Add `"start": "node ./dist/server/entry.mjs"` script to `package.json`
- [x] 1.4 Verify `pnpm build` emits `dist/server/entry.mjs` and `node ./dist/server/entry.mjs` serves the page

## 2. Extract calendar logic with caching

- [x] 2.1 Create `src/lib/calendar.ts` moving the ICS fetch, recurring-event expansion, and day grouping from the page frontmatter into a `getWeek()` function keyed by the current day (the rolling window starts today)
- [x] 2.2 Add an in-memory TTL cache (default 10 min) keyed by the current day; return cached data on hit, re-fetch on miss/expiry
- [x] 2.3 Expose the cache-fill timestamp so the footer can show when content was last refreshed

## 3. Update the page for runtime rendering

- [x] 3.1 Refactor `src/pages/index.astro` frontmatter to call `getWeek()` and read `CALENDARS` from `process.env` at request time (drop the `import.meta.env.CALENDARS` fallback in production; keep a `import.meta.env.DEV`-gated fallback so `.env` still works in dev)
- [x] 3.2 Update the config-error state text so it no longer says "run `pnpm build` again" and reflects runtime env
- [x] 3.3 Rename the footer label from "Built" to "Updated" using the cache-fill timestamp
- [x] 3.4 Confirm output markup/CSS is unchanged from the static build
- [x] 3.5 Set `Cache-Control: no-cache` on the HTML response (e.g. `Astro.response.headers.set` in the page frontmatter) so the Kindle doesn't cache a stale week

## 4. Update deployment

- [x] 4.1 Rewrite `Dockerfile` with three stages: `build` (same as today, no `CALENDARS` ARG), `deps` (`node:lts-alpine` + `pnpm install --prod --frozen-lockfile`), `runtime` (`node:lts-alpine`, `ENV HOST=0.0.0.0`/`ENV PORT=4321`, copy `dist/` from `build` and `node_modules` from `deps`, `EXPOSE 4321`, `CMD ["node", "./dist/server/entry.mjs"]`)
- [x] 4.2 Delete `nginx.conf`
- [x] 4.3 Update `README.md` and `docs/astro-docker-deployment.md`: runtime `CALENDARS`, Node deployment, removal of the daily rebuild/n8n cron

## 5. Verify

- [x] 5.1 Run `pnpm build` and `pnpm start`, load the page, and confirm the current week renders with a fresh "Updated" timestamp
- [x] 5.2 Simulate week rollover or TTL expiry and confirm re-fetch happens and the week advances
- [x] 5.3 Unset `CALENDARS` at runtime and confirm the friendly config-error page renders
- [x] 5.4 Build the Docker image and confirm the container serves the page on the configured port without `CALENDARS` at build time