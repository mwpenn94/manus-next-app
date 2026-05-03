# ── Stage 1: Dependencies ────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# ── Stage 2: Build ───────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ── Stage 3: Production ─────────────────────────────────────────
FROM node:22-alpine AS production
RUN apk add --no-cache tini git
WORKDIR /app

# Non-root user
RUN addgroup -S manus && adduser -S manus -G manus

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle

RUN chown -R manus:manus /app
USER manus

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/healthz || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
