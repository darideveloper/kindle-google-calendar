---
created: 2026-07-27
updated: 2026-07-27
tags:
  - astro
  - development
  - portless
  - documentation
type: resource
status: active
---

# Portless Dev Workflow

Replaces hardcoded port numbers with stable, named `.localhost` URLs. Eliminates port conflicts, cookie/storage clashes between projects, and the need to remember port numbers. Provides production-like HTTPS during development.

## How It Works

```
Browser ──> https://<project-name>.localhost
                   │
          Portless Proxy (port 443 / 1355)
          Local CA + auto-HTTPS
                   │
          Astro Dev Server (ephemeral port, e.g. 4737)
```

Portless runs a local HTTPS/2 proxy that routes named `.localhost` subdomains to ephemeral dev server ports. It assigns a random port (4000–4999) and injects it as the `PORT` environment variable into the child process.

The `astro.config.mjs` reads `process.env.PORT` to determine the listen port, falling back to `4321` when running outside portless:

```js
server: {
  port: process.env.PORT ? parseInt(process.env.PORT) : 4321,
}
```

## Prerequisites

```bash
npm install -g portless
```

## Setup per Project

1. Install portless globally (see above)
2. Change the `dev` script in `package.json` to wrap the Astro dev server:

```json
{
  "scripts": {
    "dev": "portless <project-name> pnpm astro dev"
  }
}
```

3. Configure `astro.config.mjs` to accept the `PORT` env var:

```js
export default defineConfig({
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4321,
  },
})
```

4. Create `.env` with the dev URL (used for redirects, canonical links, etc.):

```bash
SITE_URL=https://<project-name>.localhost
```

## Commands

| Action | Command |
|---|---|
| Start dev server | `pnpm run dev` |
| Stop | `portless stop <project-name>` |
| Check status | `portless status` |

## Environment Variables

Portless injects the following into the child process:

- `PORT` — Ephemeral port the Astro dev server listens on
- `HOST` — Typically `127.0.0.1`
- `PORTLESS_URL` — Public URL (e.g. `https://<project-name>.localhost`)

## Troubleshooting

| Issue | Fix |
|---|---|
| `command not found: portless` | Run `npm install -g portless` |
| `.localhost` doesn't resolve (Safari, Firefox) | Run `portless hosts sync` to add entries to `/etc/hosts` |
| Port conflict on 443 | Portless falls back to 1355; check `portless status` |
| Dev server won't start | Ensure no other process is on the assigned port; `portless stop <project-name>` then retry |

## Key Rules

- Portless is installed globally, not in `package.json` dependencies
- The `strictPort: true` setting ensures the dev server fails fast if the assigned port is taken
- `.localhost` subdomains resolve natively in Chrome, Firefox, and Edge — no `/etc/hosts` needed for those browsers
- Portless stores its CA, TLS certs, and route state in `~/.portless/`

## Connection to Other Patterns

- `SITE_URL` env var is consumed by the app for form redirects and canonical links → see [[astro-site-config]]
- In production, the app is served via Docker/nginx, not portless → see [[astro-docker-deployment]]
