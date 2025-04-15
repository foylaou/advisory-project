#!/bin/bash

# Define pid file location
PID_FILE="./server.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
  echo "Server is not running (PID file not found)"
  exit 1
fi

# Get PID from file
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null; then
  echo "Server is not running (process not found)"
  rm "$PID_FILE"
  exit 1
fi

# Kill the process
echo "Stopping server with PID: $PID"
kill "$PID"

# Wait for process to terminate
for i in {1..10}; do
  if ! ps -p "$PID" > /dev/null; then
    break
  fi
  echo "Waiting for server to stop..."
  sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null; then
  echo "Server did not stop gracefully. Forcing termination..."
  kill -9 "$PID"
fi

# Remove PID file
rm "$PID_FILE"
echo "Server stopped successfully"
