#!/bin/sh
# Entrypoint script for NoteHub backend
# Fixes volume permissions for non-root user before starting the application

set -e

# Fix ownership of volume-mounted directories if running as root
# This happens on first container start when volumes are mounted
if [ "$(id -u)" = "0" ]; then
  echo "Running as root, fixing permissions for appuser..."
  
  # Fix data directory permissions (for SQLite database)
  if [ -d /app/data ]; then
    chown -R appuser:appuser /app/data
    echo "Fixed permissions for /app/data"
  fi
  
  # Fix uploads directory permissions
  if [ -d /app/uploads ]; then
    chown -R appuser:appuser /app/uploads
    echo "Fixed permissions for /app/uploads"
  fi
  
  # Switch to appuser and execute the command
  echo "Switching to appuser and starting application..."
  exec su-exec appuser "$@"
else
  # Already running as appuser, just execute the command
  exec "$@"
fi
