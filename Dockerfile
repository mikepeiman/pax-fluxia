# ============================================================================
# Pax Fluxia — Single-container production build
# Stage 1: Build the SvelteKit SPA client (Bun for speed)
# Stage 2: Production server — Node runtime with Bun for dependency install
#           (Bun WS runtime is incompatible with ws lib)
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
# CRITICAL: Must use Node runtime, NOT Bun.
# Bun's WebSocket implementation is incompatible with the `ws` library
# used by @colyseus/ws-transport (causes "seat reservation expired" / 4002).
FROM node:20-slim AS production

WORKDIR /app

# Install Bun (for workspace:* dependency resolution only — NOT for runtime)
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    apt-get purge -y curl unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy workspace root + package manifests + lockfile
COPY package.json bun.lock ./
COPY common/package.json ./common/
COPY pax-fluxia/package.json ./pax-fluxia/
COPY pax-server/package.json ./pax-server/

# Install deps with Bun (handles workspace:* protocol)
# Then remove Bun cache to save image size
RUN bun install && rm -rf /root/.bun/install

# Install tsx globally for TypeScript execution under Node
RUN npm install -g tsx

# Copy server + common source
COPY common/ ./common/
COPY pax-server/ ./pax-server/

# Copy the built SPA from stage 1
COPY --from=client-build /app/pax-fluxia/build ./client

# Verify client files are present
RUN ls -la ./client/ && test -f ./client/index.html && echo "✅ Client build verified"

# Expose single port (Express + Colyseus on same port)
EXPOSE 2567

# Start the production server with Node (via tsx for TypeScript support)
CMD ["tsx", "pax-server/src/prod.ts"]
