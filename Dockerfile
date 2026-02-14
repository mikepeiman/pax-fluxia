# ============================================================================
# Pax Fluxia — Single-container production build (bun-native)
# Stage 1: Build the SvelteKit SPA client
# Stage 2: Production server (Express + Colyseus on same port)
# ============================================================================

# --- Stage 1: Build Client ---
FROM oven/bun:1 AS client-build

WORKDIR /app

# Copy workspace root + all package.json files (for dependency resolution)
COPY package.json bun.lock ./
COPY common/package.json ./common/
COPY pax-fluxia/package.json ./pax-fluxia/
COPY pax-server/package.json ./pax-server/

# Install ALL workspace dependencies (needed for common + client build)
RUN bun install

# Copy source for common (shared types) and client
COPY common/ ./common/
COPY pax-fluxia/ ./pax-fluxia/

# Build the SvelteKit SPA → output in pax-fluxia/build/
RUN cd pax-fluxia && bun run build

# --- Stage 2: Production Server ---
FROM oven/bun:1 AS production

WORKDIR /app

# Copy workspace root + package manifests + lockfile
COPY package.json bun.lock ./
COPY common/package.json ./common/
COPY pax-fluxia/package.json ./pax-fluxia/
COPY pax-server/package.json ./pax-server/

# Install only what's needed (bun handles workspaces natively)
RUN bun install --production

# Copy server + common source
COPY common/ ./common/
COPY pax-server/ ./pax-server/

# Copy the built SPA from stage 1
COPY --from=client-build /app/pax-fluxia/build ./client

# Expose the single port (Colyseus + static files on same port)
EXPOSE 2567

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD bun -e "fetch('http://localhost:2567/matchmake/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the production server with bun
CMD ["bun", "run", "pax-server/src/prod.ts"]
