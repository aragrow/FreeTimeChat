# ================================
# Stage 1: Builder
# ================================
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package files for all workspaces
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY packages ./packages
COPY apps/api ./apps/api

# Build types package first (dependency for API)
WORKDIR /app/packages/types
RUN pnpm build

# Build API
WORKDIR /app/apps/api

# Generate Prisma clients
RUN pnpm prisma:generate:main
RUN pnpm prisma:generate:client

# Build TypeScript
RUN pnpm build

# ================================
# Stage 2: Production
# ================================
FROM node:18-alpine AS production

# Install pnpm
RUN coreutils enable && corepack prepare pnpm@latest --activate

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/

# Copy built types package
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/package.json ./packages/types/

# Copy API build output
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist

# Copy Prisma files
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/src/generated ./apps/api/src/generated

# Copy JWT keys directory (will be mounted or created)
RUN mkdir -p /app/apps/api/keys && chown nodejs:nodejs /app/apps/api/keys

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Switch to non-root user
USER nodejs

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
