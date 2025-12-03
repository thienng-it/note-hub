# =============================================================================
# NoteHub - Multi-stage Dockerfile for Fly.io Deployment (Primary Platform)
# Frontend: Vite + React + TypeScript
# Backend: Python Flask
# Optimized for Fly.io free tier (256MB RAM, shared CPU)
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
# Stage 2: Python Backend + Serve Static Files
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS production

# Set environment variables optimized for low memory
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=1 \
    PORT=8080 \
    APP_ENV=production \
    # Gunicorn settings for Fly.io free tier
    GUNICORN_WORKERS=1 \
    GUNICORN_THREADS=2 \
    GUNICORN_TIMEOUT=180

# Set working directory
WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Clean up pip cache
    rm -rf /root/.cache/pip

# Copy backend source code
COPY src/ ./src/
COPY wsgi.py .

# Copy built frontend from stage 1 to static directory
COPY --from=frontend-builder /frontend/dist ./static/frontend

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 8080

# Health check optimized for Fly.io suspend/resume
# - Longer interval (60s) to reduce overhead
# - Longer start period (45s) for cold starts from suspend
# - Increased retries for resilience
HEALTHCHECK --interval=60s --timeout=15s --start-period=45s --retries=5 \
    CMD curl -sf http://localhost:8080/health || exit 1

# Start gunicorn with optimized settings for Fly.io free tier
# - 1 worker: Fits in 256MB RAM
# - 2 threads: Handle concurrent requests efficiently
# - 180s timeout: Allow for slow cold starts
# - keep-alive 5: Reduce connection overhead
# - preload: Faster worker spawning
CMD ["gunicorn", \
    "--bind", "0.0.0.0:8080", \
    "--workers", "1", \
    "--threads", "2", \
    "--timeout", "180", \
    "--keep-alive", "5", \
    "--preload", \
    "--access-logfile", "-", \
    "--error-logfile", "-", \
    "--log-level", "info", \
    "wsgi:app"]
