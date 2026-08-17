---
created: 2026-07-26
updated: 2026-07-26
tags:
  - astro
  - docker
  - deployment
  - pnpm
  - nginx
  - documentation
type: resource
status: active
---

# Dockerized Deployment

Multi-stage Docker build for Astro projects. For **SSR** projects (the `@astrojs/node` adapter in standalone mode): node builds the server, a `deps` stage installs production dependencies only (the standalone server externalizes npm deps, so `node_modules` must be present at runtime), and a `runtime` stage runs the standalone server. Uses **pnpm** exclusively — never npm.

> Static projects (no adapter): the old two-stage build (`node:lts-alpine` builds `dist/`, `nginx:alpine` serves it) still applies. For SSR, use the three-stage pattern below.

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1.7

# === Stage 1: Build ===
FROM node:lts-alpine AS build
RUN npm install -g pnpm@10.18.3
WORKDIR /app

# Runtime-only env vars (e.g. CALENDARS) go on the container at deploy time.
# Only build-time values (PUBLIC_*) need an ARG/ENV pair here:
# ARG PUBLIC_API_BASE_URL
# ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL

# Install dependencies (cached layer — only invalidates on lockfile change)
COPY package.json pnpm-lock.yaml ./
# If your project uses pnpm workspaces, also copy:
# COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the SSR site
COPY . .
RUN pnpm build

# === Stage 2: Prod deps (same base image => no native-binary drift) ===
FROM node:lts-alpine AS deps
RUN npm install -g pnpm@10.18.3
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# If your project uses pnpm workspaces, also copy:
# COPY pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# === Stage 3: Runtime ===
FROM node:lts-alpine AS runtime
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

## Nginx Config (static projects only)

For **static** Astro projects served by nginx, use the config below. For SSR (the three-stage Dockerfile above), nginx is not needed — the standalone Node server serves HTML (with `Cache-Control: no-cache` set by the app) and hashed `/_astro/*` assets with immutable headers automatically.

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    ## PWA: remove this block if not using PWA
    error_page 404 /offline/index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json
               application/javascript application/rss+xml
               application/atom+xml image/svg+xml application/manifest+json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    ## PWA: remove this block if not using PWA
    # Service worker — never cache
    location ~* ^/(sw\.js|workbox-.*\.js)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }

    ## PWA: remove this block if not using PWA
    # PWA manifest
    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache" always;
        add_header Content-Type "application/manifest+json" always;
    }

    # Content-hashed assets — immutable cache
    location ~* ^/_astro/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }

    # Static assets
    location ~* \.(?:ico|gif|jpe?g|png|woff2?|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }

    # HTML pages — no cache (SPA routing)
    location / {
        try_files $uri $uri/index.html =404;
        add_header Cache-Control "no-cache" always;
    }
}
```

The template works for both PWA and non-PWA projects. Delete every section marked `## PWA: remove this block if not using PWA` (the offline `error_page`, the service worker block, and the manifest block) to get the non-PWA variant.

## Build & Run Commands

```bash
# Build image (pass build args for every PUBLIC_* env var)
docker build \
  --build-arg PUBLIC_API_BASE_URL=https://api.example.com \
  -t your-app:latest .

# Run container (SSR): map the Node port; runtime env vars like CALENDARS
# are passed at run time, not baked into the image
docker run -d \
  -e CALENDARS='[{"name":"Work","url":"https://.../basic.ics"}]' \
  -p 8080:4321 \
  your-app:latest
```

## Deployment Platforms

### Coolify / Any Docker Host

1. Point to your Git repo
2. Set build pack to **Dockerfile**
3. Add `PUBLIC_*` variables as **Build Time** vars (prefixed with `PUBLIC_`)
4. Add runtime-only vars (e.g. `CALENDARS`) as **Runtime** vars — no rebuild needed when they change
5. Map the app's port `4321` to your desired public port
6. The Dockerfile uses `node:lts-alpine` — ensure the platform supports `corepack`

### CI/CD (GitHub Actions)

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: |
          docker build \
            --build-arg PUBLIC_API_BASE_URL=${{ secrets.API_URL }} \
            -t your-app:${{ github.sha }} .
      - name: Push to registry
        run: |
          docker tag your-app:${{ github.sha }} registry.example.com/your-app:latest
          docker push registry.example.com/your-app:latest
```

## Important: pnpm Lockfile

```bash
# Always commit pnpm-lock.yaml
git add pnpm-lock.yaml

# Never use npm install — pnpm only
pnpm install    # correct
npm install     # wrong — will fail because no package-lock.json
```

Ensure `package.json` has the pnpm engines constraint:

```json
{
  "packageManager": "pnpm@<latest>",
  "engines": {
    "node": ">= LTS"
  }
}
```

## Environment Variables

| Pattern | When available | Example |
|---|---|---|
| `PUBLIC_*` | Build-time + runtime | `PUBLIC_API_BASE_URL` |
| Build ARGs | Build-time only | API keys, secrets for build |
| `import.meta.env.PUBLIC_*` | Client-side code | Front-end API URLs |
| Runtime env vars | Runtime (SSR server) | `CALENDARS`, `HOST`, `PORT` |

Astro inlines `PUBLIC_*` variables at build time. Pass them as Docker build args so they're available during `pnpm build`. In **SSR** mode, `process.env` variables are read at request time — set them as runtime env vars on the container, not build args.

## New Project Setup

```bash
# 1. Create Dockerfile (content from section 1 — three-stage for SSR)
# 2. Static projects only: create nginx.conf (content from section 2)
# 3. Add .dockerignore
```

**.dockerignore:**
```
node_modules/
dist/
.git/
.env
.env.*
*.md
.gitignore
```

## Key Rules

- Always use `pnpm install --frozen-lockfile` in Docker builds — fails if lockfile is out of sync
- Add new build ARGs for every `PUBLIC_*` env var
- `/_astro/*` assets can have immutable cache — Astro content-hashes filenames
- PWA only: service worker JS must have no-cache headers, and use `error_page 404 /offline/index.html` for SPA/PWA offline navigation
