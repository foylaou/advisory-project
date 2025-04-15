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
if ps -p "$PID" > /dev/null; then
  echo "Server is running with PID: $PID"
  echo "To view logs: tail -f server.log"
  exit 0
else
  echo "Server is not running (process not found)"
  echo "Removing stale PID file"
  rm "$PID_FILE"
  exit 1
fi
