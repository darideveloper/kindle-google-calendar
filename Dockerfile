# syntax=docker/dockerfile:1.7

# === Stage 1: Build ===
FROM node:lts-alpine AS build
RUN npm install -g pnpm@10.18.3
WORKDIR /app

# CALENDARS is read at build time (see src/pages/index.astro)
ARG CALENDARS
ENV CALENDARS=$CALENDARS

# Install dependencies (cached layer — only invalidates on lockfile change)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the static site
COPY . .
RUN pnpm build

# === Stage 2: Serve ===
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80