# ============================================================
# AgentForge — Multi-Stage Production Docker Build
# ============================================================
# Uses Bun for fast installs and builds, produces a minimal
# standalone Next.js image for production deployment.
# ============================================================

# ----------------------------------------------------------
# Stage 1: Install dependencies
# ----------------------------------------------------------
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy dependency manifests first for better cache hits
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ----------------------------------------------------------
# Stage 2: Build the application
# ----------------------------------------------------------
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js (produces .next/standalone output)
RUN bun run build

# ----------------------------------------------------------
# Stage 3: Production runner
# ----------------------------------------------------------
FROM oven/bun:1 AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run as root for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Prisma schema and database directory for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

# Set correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set the hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the standalone Next.js server
CMD ["bun", "server.js"]
