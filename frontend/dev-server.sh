#!/bin/bash

# NoteHub Frontend Dev Server Manager
# Prevents port conflicts and hanging processes

PORT=3000
LOG_FILE="/tmp/notehub-vite.log"

# Kill any existing processes on port 3000
echo "Checking for existing processes on port $PORT..."
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$PID" ]; then
  echo "Killing existing process $PID on port $PORT"
  kill -9 $PID 2>/dev/null
  sleep 1
fi

# Clean up any stuck vite processes
echo "Cleaning up stuck Vite processes..."
pkill -9 -f "vite" 2>/dev/null
sleep 1

# Start the dev server
echo "Starting Vite dev server on port $PORT..."
npm run dev 2>&1 | tee $LOG_FILE
