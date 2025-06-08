#!/bin/bash
PORT=5003
echo "--- Flask App Restart Helper ---"

# Attempt to find and kill the process using the port
echo "Checking for process on port $PORT..."
PID=$(lsof -ti :$PORT)

if [ ! -z "$PID" ]; then
  echo "Process $PID found on port $PORT. Attempting to terminate..."
  kill -9 $PID
  # Give a moment for the port to be released
  sleep 1
  echo "Process $PID terminated."
else
  echo "No process found on port $PORT."
fi

# Start the Flask application
echo "Starting Flask application (python3 app.py)..."
python3 app.py
