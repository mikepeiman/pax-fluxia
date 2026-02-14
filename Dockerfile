# ============================================================================
# Pax Fluxia — Single-container production build (bun-native)
# Stage 1: Build the SvelteKit SPA client
# Stage 2: Production server (Express 5 + Colyseus ws-transport, single port)
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

# Verify build output exists
RUN ls -la pax-fluxia/build/ && test -f pax-fluxia/build/index.html

# --- Stage 2: Production Server ---
FROM oven/bun:1 AS production

WORKDIR /app

# Copy workspace root + package manifests + lockfile
COPY package.json bun.lock ./
COPY common/package.json ./common/
COPY pax-fluxia/package.json ./pax-fluxia/
COPY pax-server/package.json ./pax-server/

# Install deps (bun handles workspaces natively)
RUN bun install --production

# Copy server + common source
COPY common/ ./common/
COPY pax-server/ ./pax-server/

# Copy the built SPA from stage 1
COPY --from=client-build /app/pax-fluxia/build ./client

# Verify client files are present
RUN ls -la ./client/ && test -f ./client/index.html && echo "✅ Client build verified"

# Expose single port (Express + Colyseus on same port)
EXPOSE 2567

# Start the production server with bun
CMD ["bun", "run", "pax-server/src/prod.ts"]
