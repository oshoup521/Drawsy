#!/bin/bash

# Script to stop ngrok tunnels for Drawsy services

if [ -f "ngrok-pids.txt" ]; then
    echo "Stopping ngrok tunnels..."
    PIDS=$(cat ngrok-pids.txt)
    kill $PIDS 2>/dev/null
    rm ngrok-pids.txt
    echo "Ngrok tunnels stopped."
else
    echo "No PID file found. Killing all ngrok processes..."
    pkill ngrok
fi

# Clean up log files
rm -f ngrok-backend.log ngrok-llm.log

echo "Cleanup complete."