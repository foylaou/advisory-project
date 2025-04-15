#!/bin/bash
# Define log file and pid file locations
LOG_FILE="./server.log"
PID_FILE="./server.pid"

# Check if server is already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    echo "Server is already running with PID: $PID"
    exit 1
  else
    echo "Removing stale PID file"
    rm "$PID_FILE"
  fi
fi

# Start the server in the background using yarn
echo "Starting server in background with yarn..."
yarn start > "$LOG_FILE" 2>&1 &

# Save the PID to file
echo $! > "$PID_FILE"
echo "Server started with PID: $(cat "$PID_FILE")"
echo "Logs are being written to: $LOG_FILE"
echo "To stop the server, run: ./stop-server.sh"