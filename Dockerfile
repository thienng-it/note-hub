# =============================================================================
# NoteHub - Multi-stage Dockerfile for Fly.io Deployment
# Frontend: Vite + React + TypeScript
# Backend: Python Flask
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend for production
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Python Backend + Serve Static Files
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    APP_ENV=production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY src/ ./src/
COPY wsgi.py .

# Copy built frontend from stage 1 to static directory
COPY --from=frontend-builder /frontend/dist ./static/frontend

# Create a health check endpoint script
RUN echo 'from flask import Flask; app = Flask(__name__); @app.route("/health"); def health(): return "OK"' > /app/health_check.py

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
