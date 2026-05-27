# ─── Stage 1: Dependencies ───
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare bun@latest --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# ─── Stage 2: Build ───
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare bun@latest --activate

WORKDIR /app

# Copy dependency manifests and install all deps (including dev)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy all source code
COPY . .

# Build the Next.js application
RUN bun run build

# ─── Stage 3: Runtime ───
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare bun@latest --activate

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy Prisma schema (needed for migrations at runtime)
COPY --from=builder /app/prisma ./prisma/

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma/

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules/

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets (public + .next/static)
COPY --from=builder /app/public ./public/
COPY --from=builder /app/.next/static ./.next/static/

# Copy the db/ directory for SQLite
COPY --from=builder /app/db ./db/

# Create data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

# Ensure correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api || exit 1

CMD ["bun", "run", "start"]
