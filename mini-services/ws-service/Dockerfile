# ============================================================
# AgentForge — WebSocket Service Docker Build
# ============================================================
# Lightweight container for the Socket.io real-time service
# running on port 3003.
# ============================================================

FROM oven/bun:1
WORKDIR /app

# Copy dependency manifests first for cache
COPY package.json bun.lock* ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Don't run as root for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsuser
RUN chown -R wsuser:nodejs /app
USER wsuser

# Expose WebSocket service port
EXPOSE 3003

# Set environment
ENV NODE_ENV=production
ENV PORT=3003

# Start the WebSocket service
CMD ["bun", "index.ts"]
