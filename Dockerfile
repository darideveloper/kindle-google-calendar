# syntax=docker/dockerfile:1.7

# === Stage 1: Build ===
FROM node:lts-alpine AS build
RUN npm install -g pnpm@10.18.3
WORKDIR /app

# Install dependencies (cached layer — only invalidates on lockfile change)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the SSR site
COPY . .
RUN pnpm build

# === Stage 2: Prod deps (same base image => no native-binary drift) ===
FROM node:lts-alpine AS deps
RUN npm install -g pnpm@10.18.3
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# === Stage 3: Runtime ===
# CALENDARS is read at request time (runtime env), not build time.
FROM node:lts-alpine AS runtime
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]