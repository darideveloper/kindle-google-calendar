## 1. Portless Dev Setup

- [x] 1.1 Update `package.json`: change `dev` script to `portless kindle-calendar pnpm astro dev` and add `"packageManager": "pnpm@10.18.3"` (consistent with Docker install)
- [x] 1.2 Update `astro.config.mjs`: add `server.port` reading `process.env.PORT` with fallback `4321`, and `server.strictPort: true`
- [x] 1.3 Verify portless: run `pnpm dev`, confirm HTTPS at `https://kindle-calendar.localhost` and that `portless status` shows the active route

## 2. Docker Image

- [x] 2.1 Create `Dockerfile`: two-stage build (`node:lts-alpine` build → `nginx:alpine` serve), `npm install -g pnpm@10.18.3`, `ARG CALENDARS`/`ENV CALENDARS=$CALENDARS`, `COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./`, `pnpm install --frozen-lockfile`, `pnpm build`, `COPY --from=build /app/dist /usr/share/nginx/html`, `COPY nginx.conf /etc/nginx/conf.d/default.conf`, `EXPOSE 80`
- [x] 2.2 Create `nginx.conf`: non-PWA server block with `try_files` for HTML, `Cache-Control: no-cache` on HTML, immutable 1y cache for `/_astro/*` and static assets, gzip, security headers
- [x] 2.3 Create `.dockerignore`: exclude `node_modules/`, `dist/`, `.git/`, `.env`, `.env.*`, `*.md`, `.gitignore`
- [x] 2.4 Verify build: `docker build --build-arg CALENDARS='[{"name":"Test","url":"https://calendar.google.com/calendar/ical/example/basic.ics"}]' -t kindle-calendar:latest .` succeeds (placeholder URL is unreachable, so the page renders an empty week — this task proves the build pipeline works)
- [x] 2.5 Verify serving: `docker run -d -p 8080:80 kindle-calendar:latest`, then `curl -I` to assert HTML responses carry `no-cache` and `/_astro/*` responses carry immutable cache
- [x] 2.6 Verify degraded build: `docker build .` without `CALENDARS` produces the "no calendars configured" page (non-fatal)

## 3. Documentation

- [x] 3.1 Update `README.md`: document portless dev command, Docker build/run commands, and the daily rebuild note (n8n cron → Coolify build hook; build-time `CALENDARS` stored in Coolify)