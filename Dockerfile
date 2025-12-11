# =============================================================================
# NoteHub - Multi-stage Dockerfile for Full Stack Deployment
# Frontend: Vite + React + TypeScript
# Backend: Node.js + Express
# Optimized for VPS deployment (256MB+ RAM)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React)
# -----------------------------------------------------------------------------
FROM node:20.18.1-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies with cache mount and production optimizations
# Only install what's needed for build (includes devDependencies for Vite/TypeScript)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --include=dev

# Copy frontend source code
COPY frontend/ ./

# Build the frontend for production with optimizations
ENV NODE_ENV=production
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend (Node.js/Express)
# -----------------------------------------------------------------------------
FROM node:20.18.1-alpine AS backend-builder

WORKDIR /backend

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit

# Copy backend source
COPY backend/src ./src
COPY backend/scripts ./scripts

# -----------------------------------------------------------------------------
# Stage 3: Production Image
# -----------------------------------------------------------------------------
FROM node:20.18.1-alpine AS production

# Install wget for healthcheck and dumb-init for proper signal handling
RUN apk add --no-cache wget dumb-init

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Copy backend from builder stage
COPY --from=backend-builder /backend/node_modules ./node_modules
COPY --from=backend-builder /backend/src ./src
COPY --from=backend-builder /backend/scripts ./scripts

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the Node.js server
CMD ["node", "src/index.js"]
