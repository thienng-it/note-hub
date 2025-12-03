# =============================================================================
# NoteHub - Multi-stage Dockerfile for Full Stack Deployment
# Frontend: Vite + React + TypeScript
# Backend: Node.js + Express
# Optimized for VPS deployment (256MB+ RAM)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies with reduced memory usage
RUN npm ci --prefer-offline --no-audit

# Copy frontend source code
COPY frontend/ ./

# Build the frontend for production with optimizations
ENV NODE_ENV=production
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend (Node.js/Express)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /backend

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
# Add build dependencies for native modules
RUN apk add --no-cache --virtual .gyp python3 make g++ && \
    npm ci --omit=dev && \
    apk del .gyp

# Copy backend source
COPY backend/src ./src
COPY backend/scripts ./scripts

# -----------------------------------------------------------------------------
# Stage 3: Production Image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

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

# Start the Node.js server
CMD ["node", "src/index.js"]
