FROM node:20-alpine

RUN corepack enable && corepack prepare bun@latest --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source
COPY index.ts ./

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN bunx prisma generate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 chatuser

# Create data directory for SQLite
RUN mkdir -p /data && chown chatuser:nodejs /data

# Ensure correct ownership
RUN chown -R chatuser:nodejs /app

USER chatuser

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3004/health || exit 1

CMD ["bun", "run", "index.ts"]
